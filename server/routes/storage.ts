import { Router } from "express";
import multer from "multer";
import { z } from "zod";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { InsertFile } from "../../shared/schema";
import { getConvex } from "../lib/convex";
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

      // Get clerkId from authenticated user for Convex call
      const clerkId = (req.user as { clerkId?: string })?.clerkId;
      if (!clerkId) {
        res.status(400).json({ error: "Missing user identifier" });
        return;
      }

      // Create file record in Convex
      // Requirements: 2.1 - Create file record in Convex using createFile mutation
      const convex = getConvex();
      const createFileArgs = {
        filename: fileName,
        originalName: req.file.originalname,
        storagePath: path,
        mimeType: req.file.mimetype,
        size: req.file.size,
        role: fileRole,
        reservationId: reservation_id ? (reservation_id as Id<"reservations">) : undefined,
        orderId: order_id ? (order_id as Id<"orders">) : undefined,
        clerkId,
      };
      const fileId = await convex.mutation(
        // @ts-expect-error - Convex API type depth issue (known TypeScript limitation)
        api.files.createFile.createFile,
        createFileArgs
      );

      // Build response with file record
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

      res.json({
        success: true,
        file: { ...fileRecord, id: fileId },
        url: fullUrl,
      });
    } catch (error: unknown) {
      handleRouteError(error, res, "File upload failed");
    }
  }
);

// Get signed URL for private file access with rate limiting
// Requirements: 2.2, 2.5 - Query Convex for file record and verify ownership
router.get("/signed-url/:fileId", downloadRateLimit, async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { fileId } = req.params;

    // Get clerkId from authenticated user for Convex call
    const clerkId = (req.user as { clerkId?: string })?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }

    // Query Convex for file record - ownership is verified in the Convex function
    // Requirements: 2.2, 2.5 - Verify ownership by comparing user IDs
    const convex = getConvex();
    let file;
    try {
      file = await convex.query(api.files.getFile.getFile, {
        fileId: fileId as Id<"files">,
        clerkId,
      });
    } catch (error) {
      // Handle access denied or file not found from Convex
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      if (errorMessage.includes("not found")) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Determine bucket based on role
    const bucketKey = getBucketKeyForRole(file.role as FileRole);

    // Generate signed URL (expires in 1 hour)
    const signedUrl = await getSignedUrl(bucketKey, file.storagePath, 3600);

    res.json({ url: signedUrl });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to generate signed URL");
  }
});

// List user files with validation
// Requirements: 2.3 - Query Convex using listFiles and return user's files
router.get("/files", validateRequest(fileFilterValidation), async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    // Get clerkId from authenticated user for Convex call
    const clerkId = (req.user as { clerkId?: string })?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }

    // Get role filter from query params
    const { type: roleFilter } = req.query as { type?: string };

    // Query Convex for user's files with optional role filter
    const convex = getConvex();
    const convexFiles = await convex.query(api.files.listFiles.listFiles, {
      role: roleFilter as "upload" | "deliverable" | "invoice" | undefined,
      clerkId,
    });

    // Transform Convex response to expected format
    const files = convexFiles.map(file => ({
      id: file._id,
      filename: file.filename,
      original_name: file.originalName,
      mime_type: file.mimeType,
      size: file.size,
      role: file.role,
      created_at: new Date(file.createdAt).toISOString(),
    }));

    res.json({ files });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to list files");
  }
});

// Delete file
// Requirements: 2.4, 2.5 - Verify ownership and delete both storage file and Convex record
router.delete("/files/:fileId", async (req, res): Promise<void> => {
  try {
    if (!req.isAuthenticated()) {
      res.status(401).json({ error: "Authentication required" });
      return;
    }

    const { fileId } = req.params;

    // Get clerkId from authenticated user for Convex call
    const clerkId = (req.user as { clerkId?: string })?.clerkId;
    if (!clerkId) {
      res.status(400).json({ error: "Missing user identifier" });
      return;
    }

    // Query Convex for file record - ownership is verified in the Convex function
    const convex = getConvex();
    let file;
    try {
      file = await convex.query(api.files.getFile.getFile, {
        fileId: fileId as Id<"files">,
        clerkId,
      });
    } catch (error) {
      // Handle access denied or file not found from Convex
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        res.status(403).json({ error: "Access denied" });
        return;
      }
      if (errorMessage.includes("not found")) {
        res.status(404).json({ error: "File not found" });
        return;
      }
      throw error;
    }

    if (!file) {
      res.status(404).json({ error: "File not found" });
      return;
    }

    // Determine bucket based on role
    const bucketKey = getBucketKeyForRole(file.role as FileRole);

    // Delete from storage
    await deleteFile(bucketKey, file.storagePath);

    // Delete Convex record
    // Requirements: 2.4 - Delete both storage file and Convex record
    await convex.mutation(api.files.deleteFile.deleteFile, {
      fileId: fileId as Id<"files">,
      clerkId,
    });

    res.json({ success: true });
  } catch (error: unknown) {
    handleRouteError(error, res, "Failed to delete file");
  }
});

export default router;
