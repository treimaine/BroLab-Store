import { ConvexHttpClient } from "convex/browser";
import { Router } from "express";
import multer from "multer";
import { isAuthenticated } from "../auth";
import { updateUserAvatar } from "../lib/convex";
import { scanFile, validateFile } from "../lib/upload";
import { uploadRateLimit } from "../middleware/rateLimiter";

const router = Router();

// Configuration multer pour stockage en mémoire
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max pour les avatars
});

// Route d'upload d'avatar
router.post(
  "/upload",
  isAuthenticated,
  uploadRateLimit,
  upload.single("avatar"),
  async (req, res): Promise<void> => {
    try {
      if (!req.file) {
        res.status(400).json({ error: "Aucun fichier fourni" });
        return;
      }

      // Validation du fichier (images uniquement)
      const validation = await validateFile(req.file, {
        category: "image",
        allowedTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
        maxSize: 5 * 1024 * 1024, // 5MB
      });

      if (!validation.valid) {
        res.status(400).json({
          error: "Validation du fichier échouée",
          details: validation.errors,
        });
        return;
      }

      // Scan antivirus
      const scanResult = await scanFile(req.file);
      if (!scanResult.safe) {
        res.status(400).json({
          error: "Le fichier n'a pas passé le scan de sécurité",
          threats: scanResult.threats,
        });
        return;
      }

      // Get Clerk user ID
      const clerkId = req.user!.id;

      // Get Convex URL and initialize client
      const convexUrl = process.env.VITE_CONVEX_URL || process.env.CONVEX_URL;
      if (!convexUrl) {
        throw new Error("CONVEX_URL environment variable is required");
      }

      const convex = new ConvexHttpClient(convexUrl);

      // Step 1: Generate upload URL from Convex using action
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const uploadUrlData = await (convex as any).action("files:generateUploadUrl", {});
      const uploadUrl = uploadUrlData.url;

      // Step 2: Upload file to Convex storage
      const uploadResponse = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": req.file.mimetype },
        body: req.file.buffer,
      });

      if (!uploadResponse.ok) {
        throw new Error("Failed to upload file to Convex storage");
      }

      const { storageId } = await uploadResponse.json();

      // Step 3: Get the storage URL using mutation
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const avatarUrl = await (convex as any).mutation("files:getStorageUrl", { storageId });

      if (!avatarUrl) {
        throw new Error("Storage URL is null");
      }

      // Step 4: Update user avatar in database using the existing helper function
      const result = await updateUserAvatar(clerkId, avatarUrl);

      if (!result) {
        throw new Error("Failed to update user avatar in database");
      }

      res.json({
        success: true,
        url: avatarUrl,
        message: "Avatar mis à jour avec succès",
      });
    } catch (error: unknown) {
      console.error("Erreur upload avatar:", error);
      const errorMessage = error instanceof Error ? error.message : String(error);
      res.status(500).json({
        error: "Erreur lors de l'upload de l'avatar",
        details: errorMessage,
      });
    }
  }
);

export default router;
