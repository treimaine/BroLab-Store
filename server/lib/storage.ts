import { api } from "../../convex/_generated/api";
import { getConvex } from "./convex";

// Storage buckets configuration
const STORAGE_BUCKETS = {
  USER_UPLOADS: "user-uploads",
  DELIVERABLES: "deliverables",
  INVOICES: "invoices",
} as const;

type StorageBucketKey = keyof typeof STORAGE_BUCKETS;

/**
 * Upload file to Convex Storage.
 * Converts file buffer to base64 and calls Convex storage action.
 *
 * @param _userId - User ID (for logging/tracking purposes)
 * @param file - File buffer to upload
 * @param bucket - Storage bucket identifier
 * @param path - File path/name for storage
 * @param options - Upload options including contentType
 * @returns Object containing storage path and URL
 * @throws Error if storage operation fails
 *
 * Requirements: 3.1
 */
export async function uploadUserFile(
  _userId: string | number,
  file: Buffer,
  bucket: StorageBucketKey,
  path: string,
  options: { contentType?: string; cacheControl?: string } = {}
): Promise<{ path: string; fullUrl: string }> {
  try {
    const convex = getConvex();

    // Convert file buffer to base64 for Convex action
    const fileData = file.toString("base64");

    // Determine MIME type from options or default to octet-stream
    const mimeType = options.contentType || "application/octet-stream";

    // Call Convex storage action
    const result = await convex.action(api.files.storage.uploadToStorage, {
      fileData,
      filename: path,
      mimeType,
      bucket: STORAGE_BUCKETS[bucket],
    });

    // Return storage path (storageId) and URL from Convex response
    return {
      path: result.storageId,
      fullUrl: result.url,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to upload file to storage: ${errorMessage}`);
  }
}

/**
 * Get URL for a file stored in Convex Storage.
 * The storageId is passed as the path parameter.
 *
 * @param _bucket - Storage bucket (not used in Convex, kept for API compatibility)
 * @param path - Storage ID returned from uploadUserFile
 * @param _expiresIn - Expiration time (not used in Convex, URLs are permanent)
 * @returns URL string for accessing the file
 * @throws Error if storage operation fails
 *
 * Requirements: 3.2
 */
export async function getSignedUrl(
  _bucket: StorageBucketKey,
  path: string,
  _expiresIn: number = 3600
): Promise<string> {
  try {
    const convex = getConvex();

    // Call Convex storage action to get URL
    const url = await convex.action(api.files.storage.getStorageUrl, {
      storageId: path,
    });

    if (!url) {
      throw new Error("File not found in storage");
    }

    return url;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to get signed URL: ${errorMessage}`);
  }
}

/**
 * Delete a file from Convex Storage.
 *
 * @param _bucket - Storage bucket (not used in Convex, kept for API compatibility)
 * @param path - Storage ID of the file to delete
 * @throws Error if deletion fails
 *
 * Requirements: 3.3
 */
export async function deleteFile(_bucket: StorageBucketKey, path: string): Promise<void> {
  try {
    const convex = getConvex();

    // Call Convex storage action to delete file
    await convex.action(api.files.storage.deleteFromStorage, {
      storageId: path,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
    throw new Error(`Failed to delete file from storage: ${errorMessage}`);
  }
}

export { STORAGE_BUCKETS };
