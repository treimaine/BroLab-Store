import { NextFunction, Request, Response } from "express";
import { createApiError } from "../../shared/validation/index";
import { scanFile, validateFile } from "../lib/upload";
import { AuthenticatedRequest } from "../types/express";

/**
 * Enhanced file upload security middleware
 * Provides comprehensive security checks for uploaded files
 */
export const enhancedFileUploadSecurity = (
  options: {
    maxFileSize?: number;
    allowedMimeTypes?: string[];
    enableAntivirusScanning?: boolean;
    enableContentAnalysis?: boolean;
    quarantineThreats?: boolean;
  } = {}
) => {
  const {
    maxFileSize = 100 * 1024 * 1024, // 100MB default
    allowedMimeTypes = [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "audio/flac",
      "application/zip",
      "application/x-zip-compressed",
      "application/x-rar-compressed",
      "application/x-7z-compressed",
    ],
    enableAntivirusScanning = true,
    enableContentAnalysis = true,
    quarantineThreats = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const requestId = (req as AuthenticatedRequest).requestId || `req_${Date.now()}`;
      const file = req.file;

      if (!file) {
        return next(); // No file to validate
      }

      console.log(`🔍 Starting enhanced security scan for file: ${file.originalname}`, {
        requestId,
        fileSize: file.size,
        mimeType: file.mimetype,
        enableAntivirusScanning,
        enableContentAnalysis,
      });

      // 1. Basic file validation
      const validation = await validateFile(file, {
        allowedTypes: allowedMimeTypes,
        maxSize: maxFileSize,
        category: "audio", // Default category for beat requests
      });

      if (!validation.valid) {
        const errorResponse = createApiError("file_validation_failed", "File validation failed", {
          userMessage: `File validation failed: ${validation.errors.join(", ")}`,
          requestId,
          context: {
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            errors: validation.errors,
          },
        });

        return res.status(400).json(errorResponse);
      }

      // 2. Enhanced antivirus scanning
      if (enableAntivirusScanning) {
        const scanResult = await scanFile(file);

        if (!scanResult.safe) {
          console.warn(`🚨 Security threats detected in file: ${file.originalname}`, {
            requestId,
            threats: scanResult.threats,
            scanTime: scanResult.scanTime,
          });

          // Log security incident
          console.error("SECURITY_INCIDENT", {
            type: "MALICIOUS_FILE_UPLOAD",
            requestId,
            fileName: file.originalname,
            fileSize: file.size,
            mimeType: file.mimetype,
            threats: scanResult.threats,
            userAgent: req.headers["user-agent"],
            ip: req.ip,
            timestamp: new Date().toISOString(),
          });

          const errorResponse = createApiError(
            "security_threat_detected",
            "Security threat detected",
            {
              userMessage: "File contains potential security threats and cannot be uploaded",
              requestId,
              context: {
                threats: scanResult.threats,
                scanTime: scanResult.scanTime,
                fileName: file.originalname,
              },
            }
          );

          return res.status(400).json(errorResponse);
        }

        console.log(`✅ File passed security scan: ${file.originalname}`, {
          requestId,
          scanTime: scanResult.scanTime,
        });
      }

      // 3. Content-specific analysis
      if (enableContentAnalysis) {
        const contentAnalysis = await analyzeFileContent(file);

        if (contentAnalysis.suspicious) {
          console.warn(`⚠️ Suspicious content detected in file: ${file.originalname}`, {
            requestId,
            suspiciousFeatures: contentAnalysis.features,
          });

          // For suspicious content, we might allow upload but flag it
          (req as AuthenticatedRequest).fileSecurity = {
            suspicious: true,
            features: contentAnalysis.features,
            riskLevel: contentAnalysis.riskLevel,
          };
        }
      }

      // 4. Add security metadata to request
      (req as AuthenticatedRequest).fileSecurity = {
        ...(req as AuthenticatedRequest).fileSecurity,
        scanned: true,
        scanTimestamp: new Date().toISOString(),
        fileHash: await generateFileHash(file),
      };

      console.log(`✅ Enhanced security check completed for: ${file.originalname}`, {
        requestId,
        fileSize: file.size,
        securityStatus: "PASSED",
      });

      next();
    } catch (error) {
      console.error("Enhanced file upload security error:", error);

      const requestId = (req as AuthenticatedRequest).requestId || `req_${Date.now()}`;
      const errorResponse = createApiError("security_check_failed", "Security check failed", {
        userMessage: "An error occurred while checking file security",
        requestId,
        context: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      res.status(500).json(errorResponse);
    }
  };
};

/**
 * Analyze file content for suspicious patterns
 */
async function analyzeFileContent(file: Express.Multer.File): Promise<{
  suspicious: boolean;
  features: string[];
  riskLevel: "low" | "medium" | "high";
}> {
  const features: string[] = [];
  let riskLevel: "low" | "medium" | "high" = "low";

  try {
    // Analyze file structure
    const buffer = file.buffer;

    // Check for unusual file structure
    if (file.mimetype?.startsWith("audio/")) {
      // Audio files should have specific headers
      const audioHeaders = {
        mp3: [0xff, 0xfb], // MP3 frame header
        wav: [0x52, 0x49, 0x46, 0x46], // RIFF header
        flac: [0x66, 0x4c, 0x61, 0x43], // fLaC header
      };

      let hasValidHeader = false;
      for (const [format, header] of Object.entries(audioHeaders)) {
        if (header.every((byte, index) => buffer[index] === byte)) {
          hasValidHeader = true;
          break;
        }
      }

      if (!hasValidHeader && file.size > 1000) {
        features.push("INVALID_AUDIO_HEADER");
        riskLevel = "medium";
      }
    }

    // Check for embedded content
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 2048));

    // Look for suspicious strings
    const suspiciousPatterns = [
      { pattern: /http[s]?:\/\/[^\s]+/gi, feature: "EMBEDDED_URLS", risk: "medium" as const },
      { pattern: /eval\s*\(/gi, feature: "EVAL_FUNCTION", risk: "high" as const },
      { pattern: /<script/gi, feature: "SCRIPT_TAGS", risk: "high" as const },
      { pattern: /powershell/gi, feature: "POWERSHELL_REFERENCE", risk: "high" as const },
      { pattern: /cmd\.exe/gi, feature: "CMD_REFERENCE", risk: "high" as const },
    ];

    for (const { pattern, feature, risk } of suspiciousPatterns) {
      if (pattern.test(content)) {
        features.push(feature);
        if (risk === "high") riskLevel = "high";
        else if (risk === "medium" && riskLevel === "low") riskLevel = "medium";
      }
    }

    // Check file size vs content ratio
    if (file.size < 1000 && file.mimetype?.startsWith("audio/")) {
      features.push("UNUSUALLY_SMALL_AUDIO");
      riskLevel = "medium";
    }
  } catch (error) {
    console.error("Content analysis error:", error);
    features.push("ANALYSIS_ERROR");
    riskLevel = "medium";
  }

  return {
    suspicious: features.length > 0,
    features,
    riskLevel,
  };
}

/**
 * Generate a hash for file integrity checking
 */
async function generateFileHash(file: Express.Multer.File): Promise<string> {
  const crypto = await import("crypto");
  const hash = crypto.createHash("sha256");
  hash.update(file.buffer);
  return hash.digest("hex");
}

/**
 * Rate limiting for file uploads
 */
export const fileUploadRateLimit = (
  options: {
    maxUploadsPerHour?: number;
    maxTotalSizePerHour?: number;
  } = {}
) => {
  const {
    maxUploadsPerHour = 10,
    maxTotalSizePerHour = 500 * 1024 * 1024, // 500MB
  } = options;

  // Simple in-memory store (in production, use Redis)
  const uploadTracking = new Map<
    string,
    {
      count: number;
      totalSize: number;
      resetTime: number;
    }
  >();

  return (req: Request, res: Response, next: NextFunction): void | Response => {
    const userKey = (req as AuthenticatedRequest).user?.id?.toString() || req.ip || "anonymous";
    const now = Date.now();
    const hourInMs = 60 * 60 * 1000;

    let userStats = uploadTracking.get(userKey);

    // Reset if hour has passed
    if (!userStats || now > userStats.resetTime) {
      userStats = {
        count: 0,
        totalSize: 0,
        resetTime: now + hourInMs,
      };
    }

    // Check limits
    if (userStats.count >= maxUploadsPerHour) {
      const errorResponse = createApiError("upload_rate_limit", "Upload rate limit exceeded", {
        userMessage: `Too many uploads. Maximum ${maxUploadsPerHour} uploads per hour allowed.`,
        requestId: (req as AuthenticatedRequest).requestId || `req_${Date.now()}`,
      });

      return res.status(429).json(errorResponse);
    }

    const fileSize = req.file?.size || 0;
    if (userStats.totalSize + fileSize > maxTotalSizePerHour) {
      const errorResponse = createApiError("upload_size_limit", "Upload size limit exceeded", {
        userMessage: `Upload size limit exceeded. Maximum ${Math.round(maxTotalSizePerHour / 1024 / 1024)}MB per hour allowed.`,
        requestId: (req as AuthenticatedRequest).requestId || `req_${Date.now()}`,
      });

      return res.status(429).json(errorResponse);
    }

    // Update tracking
    userStats.count++;
    userStats.totalSize += fileSize;
    uploadTracking.set(userKey, userStats);

    next();
  };
};

// Extend the AuthenticatedRequest type to include file security info
declare module "../types/express" {
  interface AuthenticatedRequest {
    fileSecurity?: {
      scanned?: boolean;
      scanTimestamp?: string;
      fileHash?: string;
      suspicious?: boolean;
      features?: string[];
      riskLevel?: "low" | "medium" | "high";
    };
  }
}
