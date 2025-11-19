import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import type { InsertFile } from "../../shared/schema";
import { STORAGE_BUCKETS, uploadUserFile } from "../lib/storage";
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

      // Determine bucket based on file role
      let bucket: string = STORAGE_BUCKETS.USER_UPLOADS;
      if (role === "deliverable") bucket = STORAGE_BUCKETS.DELIVERABLES;
      if (role === "invoice") bucket = STORAGE_BUCKETS.INVOICES;

      // Generate unique file path
      const fileExtension = req.file.originalname.split(".").pop();
      const fileName = `${userId}_${Date.now()}.${fileExtension}`;
      const filePath = `${role}s/${fileName}`;

      // Upload to Supabase Storage
      const { path, fullUrl } = await uploadUserFile(userId, req.file.buffer, bucket, filePath, {
        contentType: req.file.mimetype,
      });

      // Validate and save file record to database
      const fileRecord: InsertFile = {
        user_id: Number.parseInt(userId, 10),
        filename: fileName,
        original_name: req.file.originalname,
        storage_path: path,
        mime_type: req.file.mimetype,
        size: req.file.size,
        role: role as "upload" | "deliverable" | "invoice",
        reservation_id: reservation_id || null,
        order_id: order_id ? Number.parseInt(order_id, 10) : null,
        owner_id: Number.parseInt(userId, 10),
      };

      const validatedRecord = fileRecord;

      // TODO: Implement file storage with Convex
      // For now, return a temporary record with generated ID
      const data = { ...validatedRecord, id: Date.now().toString() };

      res.json({
        success: true,
        file: data,
        url: fullUrl,
      });
    } catch (error: unknown) {
      handleRouteError(error instanceof Error ? error : String(error), res, "File upload failed");
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

    // TODO: Implement file retrieval with Convex
    // For now, return a not implemented error
    res.status(501).json({
      error: "Not implemented",
      message: "File signed URL generation will be implemented with Convex",
      fileId,
      userId,
    });
  } catch (error: unknown) {
    handleRouteError(
      error instanceof Error ? error : String(error),
      res,
      "Failed to generate signed URL"
    );
  }
});

// List user files with validation
router.get("/files", validateRequest(fileFilterValidation), async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const userId = req.user!.id;

    const _filters = {
      role: req.query.role as string | undefined,
      reservation_id: req.query.reservation_id as string | undefined,
      order_id: req.query.order_id ? Number.parseInt(req.query.order_id as string, 10) : undefined,
      owner_id: userId,
    };

    // TODO: Implement file listing with Convex
    // Query files based on filters and return paginated results
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
    handleRouteError(error instanceof Error ? error : String(error), res, "Failed to list files");
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

    // TODO: Implement file deletion with Convex
    // For now, return a not implemented error
    res.status(501).json({
      error: "Not implemented",
      message: "File deletion will be implemented with Convex",
      fileId,
      userId,
    });
  } catch (error: unknown) {
    handleRouteError(error instanceof Error ? error : String(error), res, "Failed to delete file");
  }
});

export default router;
