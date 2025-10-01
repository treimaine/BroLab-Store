import { describe, expect, test } from "@jest/globals";
import {
  fileFilterValidation,
  fileUploadValidation,
  sanitizeUserInput,
  serviceOrderValidation,
  validateEmail,
  validateFilePath,
  validateFileUpload,
  validateMimeType,
  validatePhoneNumber,
  validateUUID,
} from "../shared/validation";

describe(_"Validation System Tests", _() => {
  describe(_"File Upload Validation", _() => {
    test(_"should validate correct file upload", _() => {
      const mockFile = {
        originalname: "test.pdf",
        mimetype: "application/pdf",
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test(_"should reject file too large", _() => {
      const mockFile = {
        originalname: "large.pdf",
        mimetype: "application/pdf",
        size: 60 * 1024 * 1024, // 60MB
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File size exceeds 50MB limit");
    });

    test(_"should reject invalid MIME type", _() => {
      const mockFile = {
        originalname: "test.txt",
        mimetype: "text/plain",
        size: 1024,
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("File type not allowed");
    });

    test(_"should reject executable files", _() => {
      const mockFile = {
        originalname: "malware.exe",
        mimetype: "application/octet-stream",
        size: 1024,
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Executable files are not allowed");
    });

    test(_"should reject invalid file paths", _() => {
      const mockFile = {
        originalname: "../../../etc/passwd",
        mimetype: "application/pdf",
        size: 1024,
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain("Invalid filename");
    });
  });

  describe(_"File Path Validation", _() => {
    test(_"should accept valid file paths", _() => {
      expect(validateFilePath("folder/file.pdf")).toBe(true);
      expect(validateFilePath("user_123/document.docx")).toBe(true);
      expect(validateFilePath("uploads/2025/file-name.mp3")).toBe(true);
    });

    test(_"should reject directory traversal attempts", _() => {
      expect(validateFilePath("../etc/passwd")).toBe(false);
      expect(validateFilePath("folder/../../../secret")).toBe(false);
      expect(validateFilePath("/absolute/path")).toBe(false);
      expect(validateFilePath("folder//double-slash")).toBe(false);
    });

    test(_"should reject invalid characters", _() => {
      expect(validateFilePath("file<script>.pdf")).toBe(false);
      expect(validateFilePath("file|pipe.pdf")).toBe(false);
      expect(validateFilePath("file?query.pdf")).toBe(false);
    });
  });

  describe(_"MIME Type Validation", _() => {
    test(_"should accept standard allowed types", _() => {
      expect(validateMimeType("application/pdf")).toBe(true);
      expect(validateMimeType("audio/mpeg")).toBe(true);
      expect(validateMimeType("image/jpeg")).toBe(true);
      expect(validateMimeType("application/zip")).toBe(true);
    });

    test(_"should reject non-allowed types", _() => {
      expect(validateMimeType("text/plain")).toBe(false);
      expect(validateMimeType("application/octet-stream")).toBe(false);
      expect(validateMimeType("video/mp4")).toBe(false);
    });

    test(_"should use custom allowed types", _() => {
      const customTypes = ["text/plain", "application/json"];
      expect(validateMimeType("text/plain", customTypes)).toBe(true);
      expect(validateMimeType("application/pdf", customTypes)).toBe(false);
    });
  });

  describe(_"UUID Validation", _() => {
    test(_"should accept valid UUIDs", _() => {
      expect(validateUUID("550e8400-e29b-41d4-a716-446655440000")).toBe(true);
      expect(validateUUID("6ba7b810-9dad-11d1-80b4-00c04fd430c8")).toBe(true);
      expect(validateUUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")).toBe(true);
    });

    test(_"should reject invalid UUIDs", _() => {
      expect(validateUUID("not-a-uuid")).toBe(false);
      expect(validateUUID("550e8400-e29b-41d4-a716")).toBe(false);
      expect(validateUUID("550e8400-e29b-41d4-a716-446655440000-extra")).toBe(false);
      expect(validateUUID("")).toBe(false);
    });
  });

  describe(_"Email Validation", _() => {
    test(_"should accept valid emails", _() => {
      expect(validateEmail("user@example.com")).toBe(true);
      expect(validateEmail("test.email+tag@domain.co.uk")).toBe(true);
      expect(validateEmail("user123@test-domain.org")).toBe(true);
    });

    test(_"should reject invalid emails", _() => {
      expect(validateEmail("invalid.email")).toBe(false);
      expect(validateEmail("@domain.com")).toBe(false);
      expect(validateEmail("user@")).toBe(false);
      expect(validateEmail("user@domain")).toBe(false);
      expect(validateEmail("")).toBe(false);
    });

    test(_"should reject emails that are too long", _() => {
      const longEmail = "a".repeat(250) + "@domain.com";
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe(_"Phone Number Validation", _() => {
    test(_"should accept valid phone numbers", _() => {
      expect(validatePhoneNumber("+1234567890")).toBe(true);
      expect(validatePhoneNumber("(123) 456-7890")).toBe(true);
      expect(validatePhoneNumber("+33 1 23 45 67 89")).toBe(true);
      expect(validatePhoneNumber("123-456-7890")).toBe(true);
    });

    test(_"should reject invalid phone numbers", _() => {
      expect(validatePhoneNumber("123")).toBe(false);
      expect(validatePhoneNumber("abcdefghij")).toBe(false);
      expect(validatePhoneNumber("")).toBe(false);
      expect(validatePhoneNumber("123456789012345678")).toBe(false);
    });
  });

  describe(_"Input Sanitization", _() => {
    test(_"should remove dangerous characters", _() => {
      expect(sanitizeUserInput('<script>alert("xss")</script>')).toBe("scriptalert(xss)/script");
      expect(sanitizeUserInput('Hello "World"')).toBe("Hello World");
      expect(sanitizeUserInput("It's a test & more")).toBe("Its a test  more");
    });

    test(_"should trim whitespace and limit length", _() => {
      expect(sanitizeUserInput("  hello world  ")).toBe("hello world");
      const longString = "a".repeat(1500);
      expect(sanitizeUserInput(longString)).toHaveLength(1000);
    });
  });

  describe(_"Schema Validation", _() => {
    test(_"should validate file upload schema", _() => {
      const validData = {
        name: "file.pdf",
        size: 1024,
        type: "application/pdf",
        lastModified: Date.now(),
      };

      expect_(() => fileUploadValidation.parse(validData)).not.toThrow();
    });

    test(_"should reject invalid file upload schema", _() => {
      const invalidData = {
        user_id: 1,
        filename: "",
        original_name: "",
        storage_path: "",
        mime_type: "invalid-mime",
        size: -1,
        role: "invalid_role",
      };

      expect_(() => fileUploadValidation.parse(invalidData)).toThrow();
    });

    test(_"should validate file filter schema", _() => {
      const validFilters = {
        role: "upload" as const,
        reservation_id: "550e8400-e29b-41d4-a716-446655440000",
        order_id: 123,
        owner_id: 1,
      };

      expect_(() => fileFilterValidation.parse(validFilters)).not.toThrow();
    });

    test(_"should validate service order schema", _() => {
      const validOrder = {
        service_type: "mixing" as const,
        details: "Please enhance the bass and improve the overall mix quality",
        budget: 150,
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        contact_email: "user@example.com",
        contact_phone: "+1234567890",
      };

      expect_(() => serviceOrderValidation.parse(validOrder)).not.toThrow();
    });

    test(_"should reject invalid service order schema", _() => {
      const invalidOrder = {
        user_id: 1,
        service_type: "invalid_service",
        estimated_price: -50,
        status: "invalid_status",
      };

      expect_(() => serviceOrderValidation.parse(invalidOrder)).toThrow();
    });
  });
});
