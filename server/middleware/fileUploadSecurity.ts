import { NextFunction, Request, Response } from "express";
import { createApiError } from "../../shared/validation/index";
import { scanFile, validateFile } from "../lib/upload";
import { AuthenticatedRequest } from "../types/express";
import { generateSecureRequestId } from "../utils/requestId";

/**
 * Risk level type alias for file security analysis
 */
type RiskLevel = "low" | "medium" | "high";

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
    quarantineThreats: _quarantineThreats = true,
  } = options;

  return async (req: Request, res: Response, next: NextFunction): Promise<void | Response> => {
    try {
      const requestId = (req as AuthenticatedRequest).requestId || generateSecureRequestId();
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

      const requestId = (req as AuthenticatedRequest).requestId || generateSecureRequestId();
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
 * Result of file content analysis
 */
interface ContentAnalysisResult {
  suspicious: boolean;
  features: string[];
  riskLevel: RiskLevel;
}

/**
 * Suspicious pattern definition
 */
interface SuspiciousPattern {
  pattern: RegExp;
  feature: string;
  risk: RiskLevel;
}

/**
 * Check if file has valid audio header
 */
function hasValidAudioHeader(buffer: Buffer): boolean {
  const audioHeaders: Record<string, number[]> = {
    mp3: [0xff, 0xfb], // MP3 frame header
    wav: [0x52, 0x49, 0x46, 0x46], // RIFF header
    // cspell:disable-next-line
    flac: [0x66, 0x4c, 0x61, 0x43], // fLaC header
  };

  return Object.values(audioHeaders).some(header =>
    header.every((byte, index) => buffer[index] === byte)
  );
}

/**
 * Check content for suspicious patterns and update risk level
 */
function checkSuspiciousPatterns(
  content: string,
  features: string[],
  currentRiskLevel: RiskLevel
): RiskLevel {
  const suspiciousPatterns: SuspiciousPattern[] = [
    { pattern: /https?:\/\/[^\s]+/gi, feature: "EMBEDDED_URLS", risk: "medium" },
    { pattern: /eval\s*\(/gi, feature: "EVAL_FUNCTION", risk: "high" },
    { pattern: /<script/gi, feature: "SCRIPT_TAGS", risk: "high" },
    { pattern: /powershell/gi, feature: "POWERSHELL_REFERENCE", risk: "high" },
    { pattern: /cmd\.exe/gi, feature: "CMD_REFERENCE", risk: "high" },
  ];

  let riskLevel = currentRiskLevel;

  for (const { pattern, feature, risk } of suspiciousPatterns) {
    if (pattern.test(content)) {
      features.push(feature);
      riskLevel = getHigherRiskLevel(riskLevel, risk);
    }
  }

  return riskLevel;
}

/**
 * Compare and return the higher risk level
 */
function getHigherRiskLevel(current: RiskLevel, incoming: RiskLevel): RiskLevel {
  const riskOrder: Record<RiskLevel, number> = { low: 0, medium: 1, high: 2 };
  return riskOrder[incoming] > riskOrder[current] ? incoming : current;
}

/**
 * Analyze file content for suspicious patterns
 */
async function analyzeFileContent(file: Express.Multer.File): Promise<ContentAnalysisResult> {
  const features: string[] = [];
  let riskLevel: RiskLevel = "low";

  try {
    const buffer = file.buffer;
    const isAudioFile = file.mimetype?.startsWith("audio/");

    // Check audio header validity
    if (isAudioFile && !hasValidAudioHeader(buffer) && file.size > 1000) {
      features.push("INVALID_AUDIO_HEADER");
      riskLevel = "medium";
    }

    // Check for suspicious content patterns
    const content = buffer.toString("utf8", 0, Math.min(buffer.length, 2048));
    riskLevel = checkSuspiciousPatterns(content, features, riskLevel);

    // Check for unusually small audio files
    if (isAudioFile && file.size < 1000) {
      features.push("UNUSUALLY_SMALL_AUDIO");
      riskLevel = getHigherRiskLevel(riskLevel, "medium");
    }
  } catch (error) {
    console.error("Content analysis error:", error);
    features.push("ANALYSIS_ERROR");
    riskLevel = "medium";
  }

  return { suspicious: features.length > 0, features, riskLevel };
}

/**
 * Generate a hash for file integrity checking
 */
async function generateFileHash(file: Express.Multer.File): Promise<string> {
  const crypto = await import("node:crypto");
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
        requestId: (req as AuthenticatedRequest).requestId || generateSecureRequestId(),
      });

      return res.status(429).json(errorResponse);
    }

    const fileSize = req.file?.size || 0;
    if (userStats.totalSize + fileSize > maxTotalSizePerHour) {
      const errorResponse = createApiError("upload_size_limit", "Upload size limit exceeded", {
        userMessage: `Upload size limit exceeded. Maximum ${Math.round(maxTotalSizePerHour / 1024 / 1024)}MB per hour allowed.`,
        requestId: (req as AuthenticatedRequest).requestId || generateSecureRequestId(),
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
      riskLevel?: RiskLevel;
    };
  }
}
