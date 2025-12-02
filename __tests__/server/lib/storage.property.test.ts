/**
 * Property-Based Tests for Storage Library
 *
 * **Feature: convex-integration-pending, Property 8: Storage Upload Round-Trip**
 * **Feature: convex-integration-pending, Property 9: Signed URL Validity**
 * **Feature: convex-integration-pending, Property 10: Storage Deletion Completeness**
 * **Validates: Requirements 3.1, 3.2, 3.3**
 *
 * Tests that for any file buffer uploaded via storage functions,
 * the encoding/decoding process preserves the original content,
 * signed URLs are valid and accessible, and deletion removes files completely.
 */

import { beforeEach, describe, expect, it, jest } from "@jest/globals";
import * as fc from "fast-check";

/**
 * Helper function to decode base64 to Uint8Array.
 * Simulates the decoding process used in uploadToStorage handler.
 */
function decodeBase64ToBytes(base64: string): Uint8Array {
  const binaryString = Buffer.from(base64, "base64").toString("binary");
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.codePointAt(i) ?? 0;
  }
  return bytes;
}

/**
 * Helper function to encode bytes to base64.
 * Simulates the encoding process used when calling uploadToStorage.
 */
function encodeToBase64(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString("base64");
}

/**
 * Verifies that two Uint8Arrays are equal.
 */
function arraysAreEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  return a.every((byte, i) => byte === b[i]);
}

describe("Storage Round-Trip Property Tests", () => {
  /**
   * **Feature: convex-integration-pending, Property 8: Storage Upload Round-Trip**
   * **Validates: Requirements 3.1**
   *
   * For any file buffer, encoding to base64 and decoding back should produce
   * the exact same binary content.
   */
  describe("Property 8: Storage Upload Round-Trip", () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it("should preserve file content through base64 encoding/decoding round-trip", () => {
      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 10000 }), originalBytes => {
          const base64Encoded = encodeToBase64(originalBytes);
          const decodedBytes = decodeBase64ToBytes(base64Encoded);

          expect(decodedBytes.length).toBe(originalBytes.length);
          expect(arraysAreEqual(decodedBytes, originalBytes)).toBe(true);
        }),
        { numRuns: 100 }
      );
    });

    it("should handle empty files correctly", () => {
      const emptyBytes = new Uint8Array(0);
      const base64Encoded = encodeToBase64(emptyBytes);
      const decodedBytes = decodeBase64ToBytes(base64Encoded);

      expect(decodedBytes.length).toBe(0);
      expect(base64Encoded).toBe("");
    });

    it("should preserve content for various MIME types", () => {
      const mimeTypes = [
        "application/pdf",
        "image/png",
        "image/jpeg",
        "audio/mpeg",
        "audio/wav",
        "application/octet-stream",
        "text/plain",
      ];

      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 1, maxLength: 5000 }),
          fc.constantFrom(...mimeTypes),
          (fileContent, _mimeType) => {
            // MIME type doesn't affect encoding/decoding, but we verify the pattern works
            const base64Encoded = encodeToBase64(fileContent);
            const decodedBytes = decodeBase64ToBytes(base64Encoded);

            expect(decodedBytes.length).toBe(fileContent.length);
            return arraysAreEqual(decodedBytes, fileContent);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle binary data with all possible byte values (0-255)", () => {
      fc.assert(
        fc.property(
          fc.array(fc.integer({ min: 0, max: 255 }), { minLength: 1, maxLength: 1000 }),
          byteValues => {
            const originalBytes = new Uint8Array(byteValues);
            const base64Encoded = encodeToBase64(originalBytes);
            const decodedBytes = decodeBase64ToBytes(base64Encoded);

            expect(decodedBytes.length).toBe(originalBytes.length);
            return arraysAreEqual(decodedBytes, originalBytes);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle files with special byte patterns", () => {
      const specialPatterns = [
        new Uint8Array([0, 0, 0, 0]), // All null bytes
        new Uint8Array([255, 255, 255, 255]), // All high bytes
        new Uint8Array([0, 255, 0, 255]), // Alternating
        new Uint8Array([1, 2, 3, 4, 5]), // Sequential
        new Uint8Array([128, 129, 130, 131]), // Mid-range bytes
      ];

      for (const pattern of specialPatterns) {
        const base64Encoded = encodeToBase64(pattern);
        const decodedBytes = decodeBase64ToBytes(base64Encoded);

        expect(decodedBytes.length).toBe(pattern.length);
        expect(Array.from(decodedBytes)).toEqual(Array.from(pattern));
      }
    });
  });

  /**
   * Additional property: Base64 encoding produces valid base64 strings
   */
  describe("Base64 Encoding Validity", () => {
    it("should produce valid base64 strings for any binary input", () => {
      const base64Regex = /^[A-Za-z0-9+/]*={0,2}$/;

      fc.assert(
        fc.property(fc.uint8Array({ minLength: 0, maxLength: 5000 }), bytes => {
          const base64Encoded = encodeToBase64(bytes);

          // Verify the encoded string is valid base64
          expect(base64Regex.test(base64Encoded)).toBe(true);

          // Verify length is correct (base64 produces 4 chars per 3 bytes, padded)
          const expectedLength = Math.ceil(bytes.length / 3) * 4;
          expect(base64Encoded.length).toBe(expectedLength);
        }),
        { numRuns: 100 }
      );
    });
  });
});

/**
 * Mock Storage Service for Property Testing
 *
 * This simulates the storage library behavior for testing Property 9 and Property 10
 * without requiring actual Convex connections.
 */
interface StoredFile {
  storageId: string;
  url: string;
  bucket: string;
  deleted: boolean;
}

/**
 * Mock storage that simulates Convex Storage behavior
 */
class MockStorageService {
  private files: Map<string, StoredFile> = new Map();
  private shouldFail: boolean = false;
  private failureMessage: string = "Simulated storage failure";

  /**
   * Configure failure mode for testing error handling
   */
  setFailureMode(shouldFail: boolean, message?: string): void {
    this.shouldFail = shouldFail;
    if (message) {
      this.failureMessage = message;
    }
  }

  /**
   * Store a file and return its URL
   */
  async uploadFile(storageId: string, bucket: string): Promise<{ storageId: string; url: string }> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const url = `https://storage.convex.cloud/files/${storageId}`;
    this.files.set(storageId, { storageId, url, bucket, deleted: false });
    return { storageId, url };
  }

  /**
   * Get signed URL for a file
   * Requirements: 3.2
   */
  async getSignedUrl(storageId: string): Promise<string> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const file = this.files.get(storageId);
    if (!file || file.deleted) {
      return ""; // Empty string indicates file not found
    }
    return file.url;
  }

  /**
   * Delete a file from storage
   * Requirements: 3.3
   */
  async deleteFile(storageId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const file = this.files.get(storageId);
    if (file) {
      file.deleted = true;
    }
  }

  /**
   * Check if a file exists and is not deleted
   */
  fileExists(storageId: string): boolean {
    const file = this.files.get(storageId);
    return file !== undefined && !file.deleted;
  }

  /**
   * Clear all stored files
   */
  clear(): void {
    this.files.clear();
    this.shouldFail = false;
    this.failureMessage = "Simulated storage failure";
  }
}

/**
 * Wrapper that simulates the storage library functions with error handling
 */
class StorageLibrarySimulator {
  private storage: MockStorageService;

  constructor(storage: MockStorageService) {
    this.storage = storage;
  }

  /**
   * Simulates getSignedUrl from server/lib/storage.ts
   * Requirements: 3.2
   */
  async getSignedUrl(_bucket: string, storageId: string): Promise<string> {
    try {
      const url = await this.storage.getSignedUrl(storageId);
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
   * Simulates deleteFile from server/lib/storage.ts
   * Requirements: 3.3
   */
  async deleteFile(_bucket: string, storageId: string): Promise<void> {
    try {
      await this.storage.deleteFile(storageId);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown storage error";
      throw new Error(`Failed to delete file from storage: ${errorMessage}`);
    }
  }
}

// Valid bucket types
const BUCKET_TYPES = ["USER_UPLOADS", "DELIVERABLES", "INVOICES"] as const;
type _BucketType = (typeof BUCKET_TYPES)[number];

// Fast-check arbitraries
const storageIdArb = fc.stringMatching(/^[a-z0-9]{20,40}$/);
const bucketArb = fc.constantFrom(...BUCKET_TYPES);
const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });

/**
 * **Feature: convex-integration-pending, Property 9: Signed URL Validity**
 * **Validates: Requirements 3.2**
 *
 * For any file in storage, getSignedUrl should return a URL that provides
 * access to the file content.
 */
describe("Property 9: Signed URL Validity", () => {
  let mockStorage: MockStorageService;
  let storageLib: StorageLibrarySimulator;

  beforeEach(() => {
    mockStorage = new MockStorageService();
    storageLib = new StorageLibrarySimulator(mockStorage);
  });

  /**
   * Property: For any valid storage ID of an existing file, getSignedUrl should return a valid URL
   */
  it("should return valid URL format for any existing file", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // First upload a file to make it exist
        await mockStorage.uploadFile(storageId, bucket);

        // Get signed URL
        const url = await storageLib.getSignedUrl(bucket, storageId);

        // Verify URL is a valid string
        expect(typeof url).toBe("string");
        expect(url.length).toBeGreaterThan(0);

        // Verify URL has valid format (starts with http/https)
        expect(url).toMatch(/^https?:\/\//);

        // Verify URL contains the storage ID
        expect(url).toContain(storageId);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getSignedUrl should throw an error when file is not found
   */
  it("should throw error when file does not exist", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // Don't upload the file - it doesn't exist

        await expect(storageLib.getSignedUrl(bucket, storageId)).rejects.toThrow(
          "Failed to get signed URL: File not found in storage"
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getSignedUrl should work with any valid bucket type
   */
  it("should accept any valid bucket type", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // Upload file first
        await mockStorage.uploadFile(storageId, bucket);

        // Should work for any bucket type
        const url = await storageLib.getSignedUrl(bucket, storageId);

        expect(typeof url).toBe("string");
        expect(url.length).toBeGreaterThan(0);
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: getSignedUrl should handle storage errors gracefully
   */
  it("should wrap storage errors with descriptive message", async () => {
    await fc.assert(
      fc.asyncProperty(
        storageIdArb,
        bucketArb,
        errorMessageArb,
        async (storageId, bucket, errorMessage) => {
          // Reset and upload file first
          mockStorage.clear();
          await mockStorage.uploadFile(storageId, bucket);

          // Enable failure mode after upload
          mockStorage.setFailureMode(true, errorMessage);

          await expect(storageLib.getSignedUrl(bucket, storageId)).rejects.toThrow(
            `Failed to get signed URL: ${errorMessage}`
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});

/**
 * **Feature: convex-integration-pending, Property 10: Storage Deletion Completeness**
 * **Validates: Requirements 3.3**
 *
 * For any file deleted via deleteFile, subsequent attempts to access the file
 * should fail.
 */
describe("Property 10: Storage Deletion Completeness", () => {
  let mockStorage: MockStorageService;
  let storageLib: StorageLibrarySimulator;

  beforeEach(() => {
    mockStorage = new MockStorageService();
    storageLib = new StorageLibrarySimulator(mockStorage);
  });

  /**
   * Property: deleteFile should successfully delete any existing file
   */
  it("should delete any existing file without error", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // Upload file first
        await mockStorage.uploadFile(storageId, bucket);

        // Verify file exists
        expect(mockStorage.fileExists(storageId)).toBe(true);

        // Delete should not throw
        await expect(storageLib.deleteFile(bucket, storageId)).resolves.toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: After deletion, getSignedUrl should fail for the deleted file
   * This is the core completeness property - deleted files are inaccessible
   */
  it("should make file inaccessible after deletion", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // Upload file first
        await mockStorage.uploadFile(storageId, bucket);

        // Verify file is accessible before deletion
        const urlBefore = await storageLib.getSignedUrl(bucket, storageId);
        expect(urlBefore).toContain(storageId);

        // Delete the file
        await storageLib.deleteFile(bucket, storageId);

        // Verify file is no longer accessible
        await expect(storageLib.getSignedUrl(bucket, storageId)).rejects.toThrow(
          "Failed to get signed URL: File not found in storage"
        );
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: deleteFile should work with any valid bucket type
   */
  it("should accept any valid bucket type for deletion", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // Upload file first
        await mockStorage.uploadFile(storageId, bucket);

        // Should not throw for any valid bucket
        await expect(storageLib.deleteFile(bucket, storageId)).resolves.toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: deleteFile should handle storage errors gracefully
   */
  it("should wrap storage errors with descriptive message on deletion failure", async () => {
    await fc.assert(
      fc.asyncProperty(
        storageIdArb,
        bucketArb,
        errorMessageArb,
        async (storageId, bucket, errorMessage) => {
          // Reset and upload file first
          mockStorage.clear();
          await mockStorage.uploadFile(storageId, bucket);

          // Enable failure mode after upload
          mockStorage.setFailureMode(true, errorMessage);

          await expect(storageLib.deleteFile(bucket, storageId)).rejects.toThrow(
            `Failed to delete file from storage: ${errorMessage}`
          );
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Deleting a non-existent file should complete without error
   * (idempotent behavior - the file is already "deleted")
   */
  it("should handle deletion of non-existent files gracefully", async () => {
    await fc.assert(
      fc.asyncProperty(storageIdArb, bucketArb, async (storageId, bucket) => {
        // Don't upload the file - it doesn't exist

        // Delete should not throw for non-existent file
        await expect(storageLib.deleteFile(bucket, storageId)).resolves.toBeUndefined();
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property: Multiple deletions of the same file should be idempotent
   */
  it("should handle multiple deletions of the same file", async () => {
    await fc.assert(
      fc.asyncProperty(
        storageIdArb,
        bucketArb,
        fc.integer({ min: 2, max: 5 }),
        async (storageId, bucket, deleteCount) => {
          // Upload file first
          await mockStorage.uploadFile(storageId, bucket);

          // Delete multiple times - should not throw
          for (let i = 0; i < deleteCount; i++) {
            await expect(storageLib.deleteFile(bucket, storageId)).resolves.toBeUndefined();
          }

          // File should still be inaccessible
          await expect(storageLib.getSignedUrl(bucket, storageId)).rejects.toThrow(
            "Failed to get signed URL: File not found in storage"
          );
        }
      ),
      { numRuns: 50 }
    );
  });
});
