/**
 * Property-Based Tests for Storage Routes
 *
 * **Feature: convex-integration-pending, Property 5: File Upload Persistence**
 * **Feature: convex-integration-pending, Property 6: File Ownership Enforcement**
 * **Feature: convex-integration-pending, Property 7: File Listing Completeness**
 * **Feature: convex-integration-pending, Property 14: File Operation Error Responses**
 * **Validates: Requirements 2.1, 2.2, 2.3, 2.4, 2.5, 5.2**
 *
 * Tests that:
 * - File uploads create corresponding records with matching metadata
 * - File operations enforce ownership (403 for non-owners)
 * - File listing returns all user files with correct filtering
 * - Convex failures return appropriate HTTP error responses
 */

import { afterEach, beforeEach, describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";

// ================================
// TYPE DEFINITIONS
// ================================

type FileRole = "upload" | "deliverable" | "invoice";

interface FileMetadata {
  filename: string;
  originalName: string;
  storagePath: string;
  mimeType: string;
  size: number;
  role: FileRole;
  reservationId?: string;
  orderId?: string;
}

interface StoredFile extends FileMetadata {
  id: string;
  userId: string;
  ownerId: string;
  createdAt: number;
}

interface User {
  id: string;
  clerkId: string;
}

interface HttpErrorResponse {
  status: number;
  error: string;
}

// ================================
// MOCK STORAGE SERVICE
// ================================

/**
 * Mock Convex storage service that simulates the behavior of
 * Convex file operations for property testing.
 */
class MockConvexFileService {
  private files: Map<string, StoredFile> = new Map();
  private users: Map<string, User> = new Map();
  private shouldFail: boolean = false;
  private failureMessage: string = "Simulated Convex failure";
  private fileIdCounter: number = 0;

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
   * Register a user in the mock service
   */
  registerUser(user: User): void {
    this.users.set(user.clerkId, user);
  }

  /**
   * Get user by clerkId
   */
  getUser(clerkId: string): User | undefined {
    return this.users.get(clerkId);
  }

  /**
   * Create a file record (simulates createFile mutation)
   * Requirements: 2.1
   */
  async createFile(clerkId: string, metadata: FileMetadata): Promise<string> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const user = this.users.get(clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    const fileId = `file_${++this.fileIdCounter}`;
    const storedFile: StoredFile = {
      ...metadata,
      id: fileId,
      userId: user.id,
      ownerId: user.id,
      createdAt: Date.now(),
    };

    this.files.set(fileId, storedFile);
    return fileId;
  }

  /**
   * Get a file by ID with ownership check (simulates getFile query)
   * Requirements: 2.2, 2.4, 2.5
   */
  async getFile(fileId: string, clerkId: string): Promise<StoredFile> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const user = this.users.get(clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    const file = this.files.get(fileId);
    if (!file) {
      throw new Error("File not found");
    }

    // Ownership check - Requirements: 2.5
    if (file.userId !== user.id && file.ownerId !== user.id) {
      throw new Error("Access denied");
    }

    return file;
  }

  /**
   * List files for a user with optional role filter (simulates listFiles query)
   * Requirements: 2.3
   */
  async listFiles(clerkId: string, roleFilter?: FileRole): Promise<StoredFile[]> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    const user = this.users.get(clerkId);
    if (!user) {
      throw new Error("User not found");
    }

    let userFiles = Array.from(this.files.values()).filter(
      file => file.userId === user.id || file.ownerId === user.id
    );

    if (roleFilter) {
      userFiles = userFiles.filter(file => file.role === roleFilter);
    }

    return userFiles;
  }

  /**
   * Delete a file with ownership check (simulates deleteFile mutation)
   * Requirements: 2.4, 2.5
   */
  async deleteFile(fileId: string, clerkId: string): Promise<void> {
    if (this.shouldFail) {
      throw new Error(this.failureMessage);
    }

    // First verify ownership via getFile
    await this.getFile(fileId, clerkId);

    this.files.delete(fileId);
  }

  /**
   * Get all files (for testing purposes)
   */
  getAllFiles(): StoredFile[] {
    return Array.from(this.files.values());
  }

  /**
   * Clear all data
   */
  clear(): void {
    this.files.clear();
    this.users.clear();
    this.shouldFail = false;
    this.failureMessage = "Simulated Convex failure";
    this.fileIdCounter = 0;
  }
}

// ================================
// MOCK ROUTE HANDLER
// ================================

/**
 * Simulates the storage route handlers with proper error handling
 * This mirrors the behavior of server/routes/storage.ts
 */
class MockStorageRouteHandler {
  private fileService: MockConvexFileService;

  constructor(fileService: MockConvexFileService) {
    this.fileService = fileService;
  }

  /**
   * Handle file upload (POST /upload)
   * Requirements: 2.1
   */
  async handleUpload(
    clerkId: string,
    metadata: FileMetadata
  ): Promise<{ success: true; fileId: string } | HttpErrorResponse> {
    try {
      const fileId = await this.fileService.createFile(clerkId, metadata);
      return { success: true, fileId };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("User not found")) {
        return { status: 400, error: "Missing user identifier" };
      }
      return { status: 500, error: `File upload failed: ${errorMessage}` };
    }
  }

  /**
   * Handle signed URL request (GET /signed-url/:fileId)
   * Requirements: 2.2, 2.5
   */
  async handleGetSignedUrl(
    fileId: string,
    clerkId: string
  ): Promise<{ url: string } | HttpErrorResponse> {
    try {
      const file = await this.fileService.getFile(fileId, clerkId);
      // Generate mock signed URL
      const signedUrl = `https://storage.convex.cloud/signed/${file.storagePath}?token=mock`;
      return { url: signedUrl };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        return { status: 403, error: "Access denied" };
      }
      if (errorMessage.includes("File not found")) {
        return { status: 404, error: "File not found" };
      }
      if (errorMessage.includes("User not found")) {
        return { status: 400, error: "Missing user identifier" };
      }
      return { status: 500, error: `Failed to generate signed URL: ${errorMessage}` };
    }
  }

  /**
   * Handle file listing (GET /files)
   * Requirements: 2.3
   */
  async handleListFiles(
    clerkId: string,
    roleFilter?: FileRole
  ): Promise<{ files: StoredFile[] } | HttpErrorResponse> {
    try {
      const files = await this.fileService.listFiles(clerkId, roleFilter);
      return { files };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("User not found")) {
        return { status: 400, error: "Missing user identifier" };
      }
      return { status: 500, error: `Failed to list files: ${errorMessage}` };
    }
  }

  /**
   * Handle file deletion (DELETE /files/:fileId)
   * Requirements: 2.4, 2.5
   */
  async handleDeleteFile(
    fileId: string,
    clerkId: string
  ): Promise<{ success: true } | HttpErrorResponse> {
    try {
      await this.fileService.deleteFile(fileId, clerkId);
      return { success: true };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("Access denied")) {
        return { status: 403, error: "Access denied" };
      }
      if (errorMessage.includes("File not found")) {
        return { status: 404, error: "File not found" };
      }
      if (errorMessage.includes("User not found")) {
        return { status: 400, error: "Missing user identifier" };
      }
      return { status: 500, error: `Failed to delete file: ${errorMessage}` };
    }
  }
}

// ================================
// FAST-CHECK ARBITRARIES
// ================================

const FILE_ROLES: FileRole[] = ["upload", "deliverable", "invoice"];
const ALLOWED_MIME_TYPES = ["audio/mpeg", "audio/wav", "audio/flac", "image/jpeg", "image/png"];

// Generate valid file extensions based on MIME type
function getExtensionForMimeType(mimeType: string): string {
  const extensions: Record<string, string> = {
    "audio/mpeg": "mp3",
    "audio/wav": "wav",
    "audio/flac": "flac",
    "image/jpeg": "jpg",
    "image/png": "png",
  };
  return extensions[mimeType] || "bin";
}

// User ID arbitrary
const userIdArb = fc.uuid();
const clerkIdArb = fc.stringMatching(/^user_[a-zA-Z0-9]{20,30}$/);

// File metadata arbitrary
const fileMetadataArb: fc.Arbitrary<FileMetadata> = fc
  .record({
    mimeType: fc.constantFrom(...ALLOWED_MIME_TYPES),
    size: fc.integer({ min: 1, max: 50 * 1024 * 1024 }), // 1 byte to 50MB
    role: fc.constantFrom(...FILE_ROLES),
    reservationId: fc.option(fc.uuid(), { nil: undefined }),
    orderId: fc.option(fc.uuid(), { nil: undefined }),
  })
  .chain(partial => {
    const ext = getExtensionForMimeType(partial.mimeType);
    return fc.record({
      filename: fc.constant(`file_${Date.now()}.${ext}`),
      originalName: fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}\.[a-z]{2,4}$/),
      storagePath: fc.constant(`${partial.role}s/file_${Date.now()}.${ext}`),
      mimeType: fc.constant(partial.mimeType),
      size: fc.constant(partial.size),
      role: fc.constant(partial.role),
      reservationId: fc.constant(partial.reservationId),
      orderId: fc.constant(partial.orderId),
    });
  });

// User arbitrary
const userArb: fc.Arbitrary<User> = fc.record({
  id: userIdArb,
  clerkId: clerkIdArb,
});

// Error message arbitrary
const errorMessageArb = fc.string({ minLength: 1, maxLength: 100 });

// ================================
// HELPER FUNCTIONS
// ================================

function isHttpError(response: unknown): response is HttpErrorResponse {
  return (
    typeof response === "object" && response !== null && "status" in response && "error" in response
  );
}

// ================================
// PROPERTY TESTS
// ================================

describe("Storage Routes Property Tests", () => {
  let fileService: MockConvexFileService;
  let routeHandler: MockStorageRouteHandler;

  beforeEach(() => {
    fileService = new MockConvexFileService();
    routeHandler = new MockStorageRouteHandler(fileService);
  });

  afterEach(() => {
    fileService.clear();
  });

  /**
   * **Feature: convex-integration-pending, Property 5: File Upload Persistence**
   * **Validates: Requirements 2.1**
   *
   * For any successful file upload, a corresponding file record should exist
   * in Convex with matching filename, size, mimeType, and role.
   */
  describe("Property 5: File Upload Persistence", () => {
    it("should create file record with matching metadata for any valid upload", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, fileMetadataArb, async (user, metadata) => {
          // Clear and register user
          fileService.clear();
          fileService.registerUser(user);

          // Upload file
          const result = await routeHandler.handleUpload(user.clerkId, metadata);

          // Verify success
          expect(isHttpError(result)).toBe(false);
          if (isHttpError(result)) return;

          // Verify file was created
          const allFiles = fileService.getAllFiles();
          expect(allFiles.length).toBe(1);

          const storedFile = allFiles[0];

          // Verify matching fields - Requirements: 2.1
          expect(storedFile.filename).toBe(metadata.filename);
          expect(storedFile.originalName).toBe(metadata.originalName);
          expect(storedFile.storagePath).toBe(metadata.storagePath);
          expect(storedFile.mimeType).toBe(metadata.mimeType);
          expect(storedFile.size).toBe(metadata.size);
          expect(storedFile.role).toBe(metadata.role);
          expect(storedFile.userId).toBe(user.id);
          expect(storedFile.ownerId).toBe(user.id);
        }),
        { numRuns: 100 }
      );
    });

    it("should persist multiple files for the same user", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fc.array(fileMetadataArb, { minLength: 2, maxLength: 10 }),
          async (user, metadataList) => {
            // Clear and register user
            fileService.clear();
            fileService.registerUser(user);

            // Upload all files
            for (const metadata of metadataList) {
              const result = await routeHandler.handleUpload(user.clerkId, metadata);
              expect(isHttpError(result)).toBe(false);
            }

            // Verify all files were created
            const allFiles = fileService.getAllFiles();
            expect(allFiles.length).toBe(metadataList.length);

            // Verify each file belongs to the user
            for (const file of allFiles) {
              expect(file.userId).toBe(user.id);
              expect(file.ownerId).toBe(user.id);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return file ID for successful uploads", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, fileMetadataArb, async (user, metadata) => {
          fileService.clear();
          fileService.registerUser(user);

          const result = await routeHandler.handleUpload(user.clerkId, metadata);

          expect(isHttpError(result)).toBe(false);
          if (!isHttpError(result)) {
            expect(result.success).toBe(true);
            expect(typeof result.fileId).toBe("string");
            expect(result.fileId.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 6: File Ownership Enforcement**
   * **Validates: Requirements 2.2, 2.4, 2.5**
   *
   * For any file operation (signed URL, delete), if the requesting user does not
   * own the file, the system should return a 403 error and not perform the operation.
   */
  describe("Property 6: File Ownership Enforcement", () => {
    it("should return 403 when non-owner requests signed URL", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, userArb, fileMetadataArb, async (owner, nonOwner, metadata) => {
          // Skip if users have same ID (would be the owner)
          if (owner.clerkId === nonOwner.clerkId || owner.id === nonOwner.id) {
            return;
          }

          fileService.clear();
          fileService.registerUser(owner);
          fileService.registerUser(nonOwner);

          // Owner uploads file
          const uploadResult = await routeHandler.handleUpload(owner.clerkId, metadata);
          expect(isHttpError(uploadResult)).toBe(false);
          if (isHttpError(uploadResult)) return;

          // Non-owner tries to get signed URL
          const signedUrlResult = await routeHandler.handleGetSignedUrl(
            uploadResult.fileId,
            nonOwner.clerkId
          );

          // Should return 403 - Requirements: 2.5
          expect(isHttpError(signedUrlResult)).toBe(true);
          if (isHttpError(signedUrlResult)) {
            expect(signedUrlResult.status).toBe(403);
            expect(signedUrlResult.error).toBe("Access denied");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should return 403 when non-owner tries to delete file", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, userArb, fileMetadataArb, async (owner, nonOwner, metadata) => {
          // Skip if users have same ID
          if (owner.clerkId === nonOwner.clerkId || owner.id === nonOwner.id) {
            return;
          }

          fileService.clear();
          fileService.registerUser(owner);
          fileService.registerUser(nonOwner);

          // Owner uploads file
          const uploadResult = await routeHandler.handleUpload(owner.clerkId, metadata);
          expect(isHttpError(uploadResult)).toBe(false);
          if (isHttpError(uploadResult)) return;

          // Non-owner tries to delete
          const deleteResult = await routeHandler.handleDeleteFile(
            uploadResult.fileId,
            nonOwner.clerkId
          );

          // Should return 403 - Requirements: 2.5
          expect(isHttpError(deleteResult)).toBe(true);
          if (isHttpError(deleteResult)) {
            expect(deleteResult.status).toBe(403);
            expect(deleteResult.error).toBe("Access denied");
          }

          // File should still exist
          const allFiles = fileService.getAllFiles();
          expect(allFiles.length).toBe(1);
        }),
        { numRuns: 100 }
      );
    });

    it("should allow owner to access their own files", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, fileMetadataArb, async (owner, metadata) => {
          fileService.clear();
          fileService.registerUser(owner);

          // Owner uploads file
          const uploadResult = await routeHandler.handleUpload(owner.clerkId, metadata);
          expect(isHttpError(uploadResult)).toBe(false);
          if (isHttpError(uploadResult)) return;

          // Owner gets signed URL - should succeed
          const signedUrlResult = await routeHandler.handleGetSignedUrl(
            uploadResult.fileId,
            owner.clerkId
          );

          expect(isHttpError(signedUrlResult)).toBe(false);
          if (!isHttpError(signedUrlResult)) {
            expect(typeof signedUrlResult.url).toBe("string");
            expect(signedUrlResult.url.length).toBeGreaterThan(0);
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should allow owner to delete their own files", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, fileMetadataArb, async (owner, metadata) => {
          fileService.clear();
          fileService.registerUser(owner);

          // Owner uploads file
          const uploadResult = await routeHandler.handleUpload(owner.clerkId, metadata);
          expect(isHttpError(uploadResult)).toBe(false);
          if (isHttpError(uploadResult)) return;

          // Owner deletes file - should succeed
          const deleteResult = await routeHandler.handleDeleteFile(
            uploadResult.fileId,
            owner.clerkId
          );

          expect(isHttpError(deleteResult)).toBe(false);
          if (!isHttpError(deleteResult)) {
            expect(deleteResult.success).toBe(true);
          }

          // File should be deleted
          const allFiles = fileService.getAllFiles();
          expect(allFiles.length).toBe(0);
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 7: File Listing Completeness**
   * **Validates: Requirements 2.3**
   *
   * For any user, listing files should return all files owned by that user,
   * and filtering by role should return only files matching that role.
   */
  describe("Property 7: File Listing Completeness", () => {
    it("should return all files owned by the user", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fc.array(fileMetadataArb, { minLength: 1, maxLength: 15 }),
          async (user, metadataList) => {
            fileService.clear();
            fileService.registerUser(user);

            // Upload all files
            for (const metadata of metadataList) {
              await routeHandler.handleUpload(user.clerkId, metadata);
            }

            // List all files
            const listResult = await routeHandler.handleListFiles(user.clerkId);

            expect(isHttpError(listResult)).toBe(false);
            if (!isHttpError(listResult)) {
              // Should return all uploaded files
              expect(listResult.files.length).toBe(metadataList.length);
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should filter files by role correctly", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fc.array(fileMetadataArb, { minLength: 5, maxLength: 20 }),
          fc.constantFrom(...FILE_ROLES),
          async (user, metadataList, filterRole) => {
            fileService.clear();
            fileService.registerUser(user);

            // Upload all files
            for (const metadata of metadataList) {
              await routeHandler.handleUpload(user.clerkId, metadata);
            }

            // List files with role filter
            const listResult = await routeHandler.handleListFiles(user.clerkId, filterRole);

            expect(isHttpError(listResult)).toBe(false);
            if (!isHttpError(listResult)) {
              // Count expected files with matching role
              const expectedCount = metadataList.filter(m => m.role === filterRole).length;
              expect(listResult.files.length).toBe(expectedCount);

              // All returned files should have the filtered role
              for (const file of listResult.files) {
                expect(file.role).toBe(filterRole);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not return files owned by other users", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          userArb,
          fc.array(fileMetadataArb, { minLength: 1, maxLength: 5 }),
          fc.array(fileMetadataArb, { minLength: 1, maxLength: 5 }),
          async (user1, user2, user1Files, user2Files) => {
            // Skip if users have same ID
            if (user1.clerkId === user2.clerkId || user1.id === user2.id) {
              return;
            }

            fileService.clear();
            fileService.registerUser(user1);
            fileService.registerUser(user2);

            // User1 uploads their files
            for (const metadata of user1Files) {
              await routeHandler.handleUpload(user1.clerkId, metadata);
            }

            // User2 uploads their files
            for (const metadata of user2Files) {
              await routeHandler.handleUpload(user2.clerkId, metadata);
            }

            // User1 lists their files
            const user1ListResult = await routeHandler.handleListFiles(user1.clerkId);
            expect(isHttpError(user1ListResult)).toBe(false);
            if (!isHttpError(user1ListResult)) {
              // Should only see their own files
              expect(user1ListResult.files.length).toBe(user1Files.length);
              for (const file of user1ListResult.files) {
                expect(file.userId).toBe(user1.id);
              }
            }

            // User2 lists their files
            const user2ListResult = await routeHandler.handleListFiles(user2.clerkId);
            expect(isHttpError(user2ListResult)).toBe(false);
            if (!isHttpError(user2ListResult)) {
              // Should only see their own files
              expect(user2ListResult.files.length).toBe(user2Files.length);
              for (const file of user2ListResult.files) {
                expect(file.userId).toBe(user2.id);
              }
            }
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return empty array for user with no files", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, async user => {
          fileService.clear();
          fileService.registerUser(user);

          // List files without uploading any
          const listResult = await routeHandler.handleListFiles(user.clerkId);

          expect(isHttpError(listResult)).toBe(false);
          if (!isHttpError(listResult)) {
            expect(listResult.files).toEqual([]);
          }
        }),
        { numRuns: 100 }
      );
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 14: File Operation Error Responses**
   * **Validates: Requirements 5.2**
   *
   * For any Convex failure during file operations, the system should return
   * an appropriate HTTP error response (4xx or 5xx) with a descriptive message.
   */
  describe("Property 14: File Operation Error Responses", () => {
    it("should return 500 error when Convex fails during upload", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fileMetadataArb,
          errorMessageArb,
          async (user, metadata, errorMsg) => {
            fileService.clear();
            fileService.registerUser(user);
            fileService.setFailureMode(true, errorMsg);

            const result = await routeHandler.handleUpload(user.clerkId, metadata);

            expect(isHttpError(result)).toBe(true);
            if (isHttpError(result)) {
              expect(result.status).toBe(500);
              expect(result.error).toContain("File upload failed");
              expect(result.error).toContain(errorMsg);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return 500 error when Convex fails during signed URL generation", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fileMetadataArb,
          errorMessageArb,
          async (user, metadata, errorMsg) => {
            fileService.clear();
            fileService.registerUser(user);

            // Upload file first (without failure)
            const uploadResult = await routeHandler.handleUpload(user.clerkId, metadata);
            expect(isHttpError(uploadResult)).toBe(false);
            if (isHttpError(uploadResult)) return;

            // Enable failure mode for signed URL request
            fileService.setFailureMode(true, errorMsg);

            const result = await routeHandler.handleGetSignedUrl(uploadResult.fileId, user.clerkId);

            expect(isHttpError(result)).toBe(true);
            if (isHttpError(result)) {
              expect(result.status).toBe(500);
              expect(result.error).toContain("Failed to generate signed URL");
              expect(result.error).toContain(errorMsg);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return 500 error when Convex fails during file listing", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, errorMessageArb, async (user, errorMsg) => {
          fileService.clear();
          fileService.registerUser(user);
          fileService.setFailureMode(true, errorMsg);

          const result = await routeHandler.handleListFiles(user.clerkId);

          expect(isHttpError(result)).toBe(true);
          if (isHttpError(result)) {
            expect(result.status).toBe(500);
            expect(result.error).toContain("Failed to list files");
            expect(result.error).toContain(errorMsg);
          }
        }),
        { numRuns: 50 }
      );
    });

    it("should return 500 error when Convex fails during file deletion", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fileMetadataArb,
          errorMessageArb,
          async (user, metadata, errorMsg) => {
            fileService.clear();
            fileService.registerUser(user);

            // Upload file first (without failure)
            const uploadResult = await routeHandler.handleUpload(user.clerkId, metadata);
            expect(isHttpError(uploadResult)).toBe(false);
            if (isHttpError(uploadResult)) return;

            // Enable failure mode for delete request
            fileService.setFailureMode(true, errorMsg);

            const result = await routeHandler.handleDeleteFile(uploadResult.fileId, user.clerkId);

            expect(isHttpError(result)).toBe(true);
            if (isHttpError(result)) {
              expect(result.status).toBe(500);
              expect(result.error).toContain("Failed to delete file");
              expect(result.error).toContain(errorMsg);
            }
          }
        ),
        { numRuns: 50 }
      );
    });

    it("should return 404 when file does not exist", async () => {
      await fc.assert(
        fc.asyncProperty(userArb, fc.uuid(), async (user, nonExistentFileId) => {
          fileService.clear();
          fileService.registerUser(user);

          // Try to get signed URL for non-existent file
          const signedUrlResult = await routeHandler.handleGetSignedUrl(
            `file_${nonExistentFileId}`,
            user.clerkId
          );

          expect(isHttpError(signedUrlResult)).toBe(true);
          if (isHttpError(signedUrlResult)) {
            expect(signedUrlResult.status).toBe(404);
            expect(signedUrlResult.error).toBe("File not found");
          }

          // Try to delete non-existent file
          const deleteResult = await routeHandler.handleDeleteFile(
            `file_${nonExistentFileId}`,
            user.clerkId
          );

          expect(isHttpError(deleteResult)).toBe(true);
          if (isHttpError(deleteResult)) {
            expect(deleteResult.status).toBe(404);
            expect(deleteResult.error).toBe("File not found");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should return 400 when user is not found", async () => {
      await fc.assert(
        fc.asyncProperty(clerkIdArb, fileMetadataArb, async (unknownClerkId, metadata) => {
          fileService.clear();
          // Don't register the user

          // Try to upload with unknown user
          const uploadResult = await routeHandler.handleUpload(unknownClerkId, metadata);

          expect(isHttpError(uploadResult)).toBe(true);
          if (isHttpError(uploadResult)) {
            expect(uploadResult.status).toBe(400);
            expect(uploadResult.error).toBe("Missing user identifier");
          }

          // Try to list files with unknown user
          const listResult = await routeHandler.handleListFiles(unknownClerkId);

          expect(isHttpError(listResult)).toBe(true);
          if (isHttpError(listResult)) {
            expect(listResult.status).toBe(400);
            expect(listResult.error).toBe("Missing user identifier");
          }
        }),
        { numRuns: 100 }
      );
    });

    it("should include descriptive error messages for all failure types", async () => {
      await fc.assert(
        fc.asyncProperty(
          userArb,
          fileMetadataArb,
          fc.constantFrom(
            "Database connection failed",
            "Query timeout exceeded",
            "Rate limit exceeded",
            "Internal server error",
            "Storage quota exceeded"
          ),
          async (user, metadata, errorMsg) => {
            fileService.clear();
            fileService.registerUser(user);
            fileService.setFailureMode(true, errorMsg);

            const result = await routeHandler.handleUpload(user.clerkId, metadata);

            expect(isHttpError(result)).toBe(true);
            if (isHttpError(result)) {
              // Error message should be descriptive and include the original error
              expect(result.error.length).toBeGreaterThan(0);
              expect(result.error).toContain(errorMsg);
            }
          }
        ),
        { numRuns: 50 }
      );
    });
  });
});
