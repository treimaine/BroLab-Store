import { Router } from "express";
import multer from "multer";
import { createApiError } from "../../shared/validation/index";
import { isAuthenticated } from "../auth";
import { uploadToSupabase, validateFile } from "../lib/upload";
import { enhancedFileUploadSecurity, fileUploadRateLimit } from "../middleware/fileUploadSecurity";
import { uploadRateLimit } from "../middleware/rateLimiter";
import { validateFileUpload } from "../middleware/validation";
import { AuthenticatedRequest } from "../types/express";
import { handleRouteError } from "../types/routes";

const router = Router();

// Configuration multer pour stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Enhanced secure upload route
router.post(
  "/upload",
  isAuthenticated,
  fileUploadRateLimit({
    maxUploadsPerHour: 20,
    maxTotalSizePerHour: 1000 * 1024 * 1024, // 1GB per hour
  }),
  uploadRateLimit,
  upload.single("file"),
  validateFileUpload({
    maxSize: 100 * 1024 * 1024, // 100MB
    allowedTypes: [
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
    required: true,
  }),
  enhancedFileUploadSecurity({
    maxFileSize: 100 * 1024 * 1024,
    enableAntivirusScanning: true,
    enableContentAnalysis: true,
    quarantineThreats: true,
  }),
  async (req, res): Promise<void> => {
    try {
      // File validation already handled by middleware
      if (!req.file) {
        const requestId = (req as { requestId?: string }).requestId || `req_${Date.now()}`;
        const errorResponse = createApiError("file_too_large", "No file provided", {
          userMessage: "Please select a file to upload",
          requestId,
        });
        res.status(400).json(errorResponse);
        return;
      }

      // Validation du fichier
      const validation = await validateFile(req.file, {
        category: req.body.category || "audio",
      });

      if (!validation.valid) {
        res.status(400).json({
          error: "Validation du fichier échouée",
          details: validation.errors,
        });
        return;
      }

      // Security scanning is now handled by enhancedFileUploadSecurity middleware
      // Additional validation can be added here if needed

      // Génération du chemin de stockage
      const timestamp = Date.now();
      const userId = req.user!.id;
      const extension = req.file.originalname.split(".").pop();
      const filePath = `${userId}/${timestamp}.${extension}`;

      // Upload vers Supabase
      const { path, url } = await uploadToSupabase(req.file, filePath);

      // Include security information in response
      const securityInfo = (req as AuthenticatedRequest).fileSecurity || {};

      res.json({
        success: true,
        file: {
          path,
          url,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
          hash: securityInfo.fileHash,
          scanned: securityInfo.scanned,
          scanTimestamp: securityInfo.scanTimestamp,
        },
        security: {
          scanned: securityInfo.scanned || false,
          suspicious: securityInfo.suspicious || false,
          riskLevel: securityInfo.riskLevel || "low",
          features: securityInfo.features || [],
        },
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);

export default router;
