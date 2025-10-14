import { Router } from "express";
import multer from "multer";
import { createApiError } from "../../shared/validation/index";
import { isAuthenticated } from "../auth";
import { scanFile, uploadToSupabase, validateFile } from "../lib/upload";
import { uploadRateLimit } from "../middleware/rateLimiter";
import { validateFileUpload } from "../middleware/validation";
import { handleRouteError } from "../types/routes";

const router = Router();

// Configuration multer pour stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB max
});

// Route d'upload sécurisée
router.post(
  "/upload",
  isAuthenticated,
  uploadRateLimit,
  upload.single("file"),
  validateFileUpload({
    maxSize: 50 * 1024 * 1024, // 50MB
    allowedTypes: [
      "audio/mpeg",
      "audio/wav",
      "audio/mp3",
      "audio/aiff",
      "image/jpeg",
      "image/png",
      "image/gif",
      "application/pdf",
      "application/zip",
    ],
    required: true,
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

      // Scan antivirus
      const isSafe = await scanFile(req.file);
      if (!isSafe) {
        res.status(400).json({
          error: "Le fichier n'a pas passé le scan de sécurité",
        });
        return;
      }

      // Génération du chemin de stockage
      const timestamp = Date.now();
      const userId = req.user!.id;
      const extension = req.file.originalname.split(".").pop();
      const filePath = `${userId}/${timestamp}.${extension}`;

      // Upload vers Supabase
      const { path, url } = await uploadToSupabase(req.file, filePath);

      res.json({
        success: true,
        file: {
          path,
          url,
          name: req.file.originalname,
          type: req.file.mimetype,
          size: req.file.size,
        },
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);

export default router;
