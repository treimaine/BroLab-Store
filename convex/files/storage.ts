import { v } from "convex/values";
import type { Id } from "../_generated/dataModel";
import { action } from "../_generated/server";

/**
 * Storage actions for Convex file storage operations.
 * These actions handle direct file storage operations (upload, get URL, delete).
 *
 * @module convex/files/storage
 */

/**
 * Upload a file to Convex Storage from base64 encoded data.
 *
 * @param fileData - Base64 encoded file content
 * @param filename - Name of the file
 * @param mimeType - MIME type of the file (e.g., 'application/pdf', 'image/png')
 * @param bucket - Storage bucket identifier (for organizational purposes)
 * @returns Object containing storageId and URL for the uploaded file
 *
 * @example
 * const result = await ctx.runAction(api.files.storage.uploadToStorage, {
 *   fileData: base64EncodedContent,
 *   filename: "invoice.pdf",
 *   mimeType: "application/pdf",
 *   bucket: "invoices"
 * });
 */
export const uploadToStorage = action({
  args: {
    fileData: v.string(), // Base64 encoded file data
    filename: v.string(),
    mimeType: v.string(),
    bucket: v.string(), // Bucket identifier for organization
  },
  handler: async (ctx, args): Promise<{ storageId: string; url: string }> => {
    // Decode base64 to binary
    const binaryString = atob(args.fileData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.codePointAt(i) ?? 0;
    }

    // Create blob from binary data
    const blob = new Blob([bytes], { type: args.mimeType });

    // Store in Convex Storage
    const storageId = await ctx.storage.store(blob);

    // Get the URL for the stored file
    const url = await ctx.storage.getUrl(storageId);

    return {
      storageId: storageId as string,
      url: url || "",
    };
  },
});

/**
 * Get a URL for a file stored in Convex Storage.
 *
 * @param storageId - The storage ID returned from uploadToStorage
 * @returns URL string for accessing the file, or empty string if not found
 *
 * @example
 * const url = await ctx.runAction(api.files.storage.getStorageUrl, {
 *   storageId: "kg2abc123..."
 * });
 */
export const getStorageUrl = action({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args): Promise<string> => {
    const url = await ctx.storage.getUrl(args.storageId as Id<"_storage">);
    return url || "";
  },
});

/**
 * Delete a file from Convex Storage.
 *
 * @param storageId - The storage ID of the file to delete
 * @throws Error if the file cannot be deleted
 *
 * @example
 * await ctx.runAction(api.files.storage.deleteFromStorage, {
 *   storageId: "kg2abc123..."
 * });
 */
export const deleteFromStorage = action({
  args: {
    storageId: v.string(),
  },
  handler: async (ctx, args): Promise<void> => {
    await ctx.storage.delete(args.storageId as Id<"_storage">);
  },
});
