import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  validateFileUpload,
  validateFilePath,
  validateMimeType,
  validateUUID,
  validateEmail,
  validatePhoneNumber,
  sanitizeUserInput,
  fileUploadValidation,
  fileFilterValidation,
  serviceOrderValidation
} from '../server/lib/validation';

describe('Validation System Tests', () => {
  describe('File Upload Validation', () => {
    test('should validate correct file upload', () => {
      const mockFile = {
        originalname: 'test.pdf',
        mimetype: 'application/pdf',
        size: 1024 * 1024, // 1MB
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    test('should reject file too large', () => {
      const mockFile = {
        originalname: 'large.pdf',
        mimetype: 'application/pdf',
        size: 60 * 1024 * 1024, // 60MB
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File size exceeds 50MB limit');
    });

    test('should reject invalid MIME type', () => {
      const mockFile = {
        originalname: 'test.txt',
        mimetype: 'text/plain',
        size: 1024,
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('File type not allowed');
    });

    test('should reject executable files', () => {
      const mockFile = {
        originalname: 'malware.exe',
        mimetype: 'application/octet-stream',
        size: 1024,
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Executable files are not allowed');
    });

    test('should reject invalid file paths', () => {
      const mockFile = {
        originalname: '../../../etc/passwd',
        mimetype: 'application/pdf',
        size: 1024,
      } as Express.Multer.File;

      const result = validateFileUpload(mockFile);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Invalid filename');
    });
  });

  describe('File Path Validation', () => {
    test('should accept valid file paths', () => {
      expect(validateFilePath('folder/file.pdf')).toBe(true);
      expect(validateFilePath('user_123/document.docx')).toBe(true);
      expect(validateFilePath('uploads/2025/file-name.mp3')).toBe(true);
    });

    test('should reject directory traversal attempts', () => {
      expect(validateFilePath('../etc/passwd')).toBe(false);
      expect(validateFilePath('folder/../../../secret')).toBe(false);
      expect(validateFilePath('/absolute/path')).toBe(false);
      expect(validateFilePath('folder//double-slash')).toBe(false);
    });

    test('should reject invalid characters', () => {
      expect(validateFilePath('file<script>.pdf')).toBe(false);
      expect(validateFilePath('file|pipe.pdf')).toBe(false);
      expect(validateFilePath('file?query.pdf')).toBe(false);
    });
  });

  describe('MIME Type Validation', () => {
    test('should accept standard allowed types', () => {
      expect(validateMimeType('application/pdf')).toBe(true);
      expect(validateMimeType('audio/mpeg')).toBe(true);
      expect(validateMimeType('image/jpeg')).toBe(true);
      expect(validateMimeType('application/zip')).toBe(true);
    });

    test('should reject non-allowed types', () => {
      expect(validateMimeType('text/plain')).toBe(false);
      expect(validateMimeType('application/octet-stream')).toBe(false);
      expect(validateMimeType('video/mp4')).toBe(false);
    });

    test('should use custom allowed types', () => {
      const customTypes = ['text/plain', 'application/json'];
      expect(validateMimeType('text/plain', customTypes)).toBe(true);
      expect(validateMimeType('application/pdf', customTypes)).toBe(false);
    });
  });

  describe('UUID Validation', () => {
    test('should accept valid UUIDs', () => {
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(validateUUID('6ba7b810-9dad-11d1-80b4-00c04fd430c8')).toBe(true);
      expect(validateUUID('f47ac10b-58cc-4372-a567-0e02b2c3d479')).toBe(true);
    });

    test('should reject invalid UUIDs', () => {
      expect(validateUUID('not-a-uuid')).toBe(false);
      expect(validateUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(validateUUID('550e8400-e29b-41d4-a716-446655440000-extra')).toBe(false);
      expect(validateUUID('')).toBe(false);
    });
  });

  describe('Email Validation', () => {
    test('should accept valid emails', () => {
      expect(validateEmail('user@example.com')).toBe(true);
      expect(validateEmail('test.email+tag@domain.co.uk')).toBe(true);
      expect(validateEmail('user123@test-domain.org')).toBe(true);
    });

    test('should reject invalid emails', () => {
      expect(validateEmail('invalid.email')).toBe(false);
      expect(validateEmail('@domain.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail('')).toBe(false);
    });

    test('should reject emails that are too long', () => {
      const longEmail = 'a'.repeat(250) + '@domain.com';
      expect(validateEmail(longEmail)).toBe(false);
    });
  });

  describe('Phone Number Validation', () => {
    test('should accept valid phone numbers', () => {
      expect(validatePhoneNumber('+1234567890')).toBe(true);
      expect(validatePhoneNumber('(123) 456-7890')).toBe(true);
      expect(validatePhoneNumber('+33 1 23 45 67 89')).toBe(true);
      expect(validatePhoneNumber('123-456-7890')).toBe(true);
    });

    test('should reject invalid phone numbers', () => {
      expect(validatePhoneNumber('123')).toBe(false);
      expect(validatePhoneNumber('abcdefghij')).toBe(false);
      expect(validatePhoneNumber('')).toBe(false);
      expect(validatePhoneNumber('123456789012345678')).toBe(false);
    });
  });

  describe('Input Sanitization', () => {
    test('should remove dangerous characters', () => {
      expect(sanitizeUserInput('<script>alert("xss")</script>')).toBe('scriptalert(xss)/script');
      expect(sanitizeUserInput('Hello "World"')).toBe('Hello World');
      expect(sanitizeUserInput("It's a test & more")).toBe("Its a test  more");
    });

    test('should trim whitespace and limit length', () => {
      expect(sanitizeUserInput('  hello world  ')).toBe('hello world');
      const longString = 'a'.repeat(1500);
      expect(sanitizeUserInput(longString)).toHaveLength(1000);
    });
  });

  describe('Schema Validation', () => {
    test('should validate file upload schema', () => {
      const validData = {
        user_id: 1,
        filename: 'file.pdf',
        original_name: 'file.pdf',
        storage_path: 'uploads/file.pdf',
        mime_type: 'application/pdf',
        size: 1024,
        role: 'upload' as const
      };

      expect(() => fileUploadValidation.parse(validData)).not.toThrow();
    });

    test('should reject invalid file upload schema', () => {
      const invalidData = {
        user_id: 1,
        filename: '',
        original_name: '',
        storage_path: '',
        mime_type: 'invalid-mime',
        size: -1,
        role: 'invalid_role'
      };

      expect(() => fileUploadValidation.parse(invalidData)).toThrow();
    });

    test('should validate file filter schema', () => {
      const validFilters = {
        role: 'upload' as const,
        reservation_id: '550e8400-e29b-41d4-a716-446655440000',
        order_id: 123,
        owner_id: 1
      };

      expect(() => fileFilterValidation.parse(validFilters)).not.toThrow();
    });

    test('should validate service order schema', () => {
      const validOrder = {
        user_id: 1,
        service_type: 'mixing' as const,
        details: {
          duration: 60,
          tracks: 5,
          format: 'wav' as const,
          quality: 'premium' as const,
          rush: false,
          notes: 'Please enhance the bass'
        },
        estimated_price: 150.00,
        status: 'pending' as const
      };

      expect(() => serviceOrderValidation.parse(validOrder)).not.toThrow();
    });

    test('should reject invalid service order schema', () => {
      const invalidOrder = {
        user_id: 1,
        service_type: 'invalid_service',
        estimated_price: -50,
        status: 'invalid_status'
      };

      expect(() => serviceOrderValidation.parse(invalidOrder)).toThrow();
    });
  });
});