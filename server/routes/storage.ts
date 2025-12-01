import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { InsertFile } from "../../shared/schema";
import { deleteFile, getSignedUrl, uploadUserFile } from "../lib/storage";
import { createValidationMiddleware as validateRequest } from "../lib/validation";
import { downloadRateLimit, uploadRateLimit } from "../middleware/rateLimiter";
import { handleRouteError } from "../types/routes";

// Define validation schemas for file operations
const fileUploadValidation = z.object({
  file: z.any().optional(),
});

const fileFilterValidation = z.object({
  type: z.string().optional(),
  limit: z.number().min(1).max(100).optional().default(20),
  offset: z.number().min(0).optional().default(0),
});

const router = Router();

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB limit
});

type FileRole = "upload" | "deliverable" | "invoice";
type StorageBucketKey = "USER_UPLOADS" | "DELIVERABLES" | "INVOICES";

/**
 * Get storage bucket key based on file role
 */
function getBucketKeyForRole(role: FileRole): StorageBucketKey {
  switch (role) {
    case "deliverable":
      return "DELIVERABLES";
    case "invoice":
      return "INVOICES";
    default:
      return "USER_UPLOADS";
  }
}

// Upload file endpoint with validation and rate limiting
router.post(
  "/upload",
  uploadRateLimit,
  upload.single("file"),
  validateRequest(fileUploadValidation),
  async (req, res): Promise<void> => {
    try {
      if (!req.isAuthenticated()) {
        res.status(401).json({ error: "Authentication required" });
        return;
      }

      if (!req.file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }

      // Validate file upload security
      const allowedTypes = ["audio/mpeg", "audio/wav", "audio/flac", "image/jpeg", "image/png"];
      const maxSize = 50 * 1024 * 1024; // 50MB

      if (!allowedTypes.includes(req.file.mimetype)) {
        res.status(400).json({
          error: "File type not allowed",
          details: [`File type ${req.file.mimetype} is not allowed`],
        });
        return;
      }

      if (req.file.size > maxSize) {
        res.status(400).json({
          error: "File too large",
          details: [`File size ${req.file.size} exceeds maximum of ${maxSize} bytes`],
        });
        return;
      }

      const { reservation_id, order_id, role = "upload" } = req.body;
      const userId = req.user!.id;
      const fileRole = role as FileRole;

      // Determine bucket based on file role
      const bucketKey = getBucketKeyForRole(fileRole);

      // Generate unique file path
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExtension}`;
      const filePath = `${fileRole}s/${fileName}`;

      // Upload to storage
      const { path, fullUrl } = await uploadUserFile(userId, req.file.buffer, bucketKey, filePath, {
        contentType: req.file.mimetype,
      });

      // Validate and save file record to database
      const fileRecord: InsertFile = {
        user_id: Number.parseInt(userId),
        filename: fileName,
        original_name: req.file.originalname,
        storage_path: path,
        mime_type: req.file.mimetype,
        size: req.file.size,
        role: fileRole,
        reservation_id: reservation_id || null,
        order_id: order_id ? Number.parseInt(order_id) : null,
        owner_id: Number.parseInt(userId),
      };

      // Convex integration pending - using placeholder
      const data = { ...fileRecord, id: Date.now().toString() };

      res.json({
        success: true,
        file: data,
        url: fullUrl,
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);

// Get signed URL for private file access with rate limiting
router.get("/signed-url/:fileId", downloadRateLimit, async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { fileId } = req.params;
    const userId = req.user!.id;

    // Convex integration pending - using placeholder
    const file = {
      id: fileId,
      owner_id: userId,
      role: "upload" as FileRole,
      storage_path: "temp",
    };

    // Check ownership
    if (file.owner_id !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Determine bucket based on role
    const bucketKey = getBucketKeyForRole(file.role);

    // Generate signed URL (expires in 1 hour)
    const signedUrl = await getSignedUrl(bucketKey, file.storage_path, 3600);

    res.json({ url: signedUrl });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to generate signed URL");
  }
});

// List user files with validation
router.get("/files", validateRequest(fileFilterValidation), async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Convex integration pending - returning empty array
    const files: Array<{
      id: string;
      filename: string;
      original_name: string;
      mime_type: string;
      size: number;
      role: string;
      created_at: string;
    }> = [];

    res.json({ files });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to list files");
  }
});

// Delete file
router.delete("/files/:fileId", async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { fileId } = req.params;
    const userId = req.user!.id;

    // Convex integration pending - using placeholder
    const file = {
      id: fileId,
      owner_id: userId,
      role: "upload" as FileRole,
      storage_path: "temp",
    };

    // Check ownership
    if (file.owner_id !== userId) {
      res.status(403).json({ error: "Access denied" });
      return;
    }

    // Determine bucket based on role
    const bucketKey = getBucketKeyForRole(file.role);

    // Delete from storage
    await deleteFile(bucketKey, file.storage_path);

    res.json({ success: true });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to delete file");
  }
});

export default router;
