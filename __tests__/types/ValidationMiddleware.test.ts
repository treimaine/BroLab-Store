import { describe, expect, test } from "@jest/globals";
import { z } from "zod";
import {
  combineSchemas,
  extractValidationErrors,
  isValidationError,
  makeOptional,
  makePartial,
  validateFileUpload,
} from "../../shared/validation/index";

describe(_"Validation Utilities Tests", _() => {
  describe(_"combineSchemas", _() => {
    test(_"should combine two schemas", _() => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ age: z.number() });

      const combined = combineSchemas(schema1, schema2);
      const result = combined.parse({ name: "John", age: 25 });

      expect(result).toEqual({ name: "John", age: 25 });
    });

    test(_"should reject data missing fields from either schema", _() => {
      const schema1 = z.object({ name: z.string() });
      const schema2 = z.object({ age: z.number() });

      const combined = combineSchemas(schema1, schema2);

      expect_(() => combined.parse({ name: "John" })).toThrow();
      expect_(() => combined.parse({ age: 25 })).toThrow();
    });
  });

  describe(_"makeOptional", _() => {
    test(_"should make schema optional", _() => {
      const schema = z.string().min(1);
      const optional = makeOptional(schema);

      expect(optional.parse("test")).toBe("test");
      expect(optional.parse(undefined)).toBeUndefined();
    });
  });

  describe(_"makePartial", _() => {
    test(_"should make all fields in object schema optional", _() => {
      const schema = z.object({
        name: z.string(),
        age: z.number(),
        email: z.string().email(),
      });

      const partial = makePartial(schema);

      expect(partial.parse({})).toEqual({});
      expect(partial.parse({ name: "John" })).toEqual({ name: "John" });
      expect(partial.parse({ name: "John", age: 25 })).toEqual({ name: "John", age: 25 });
    });
  });

  describe(_"validateFileUpload", _() => {
    test(_"should validate valid file upload", _() => {
      const mockFile = {
        fieldname: "audio",
        originalname: "beat.mp3",
        encoding: "7bit",
        mimetype: "audio/mpeg",
        size: 5242880, // 5MB
        buffer: Buffer.from("mock file content"),
      } as Express.Multer.File;

      expect_(() => validateFileUpload(mockFile)).not.toThrow();
    });

    test(_"should reject file exceeding size limit", _() => {
      const mockFile = {
        fieldname: "audio",
        originalname: "large-beat.wav",
        encoding: "7bit",
        mimetype: "audio/wav",
        size: 60 * 1024 * 1024, // 60MB
        buffer: Buffer.from("mock file content"),
      } as Express.Multer.File;

      expect_(() => validateFileUpload(mockFile)).toThrow("File size exceeds 50MB limit");
    });

    test(_"should reject file without filename", _() => {
      const mockFile = {
        fieldname: "audio",
        originalname: "",
        encoding: "7bit",
        mimetype: "audio/mpeg",
        size: 1024,
        buffer: Buffer.from("mock file content"),
      } as Express.Multer.File;

      expect_(() => validateFileUpload(mockFile)).toThrow("Filename is required");
    });
  });

  describe(_"isValidationError", _() => {
    test(_"should identify Zod validation errors", _() => {
      const schema = z.string().min(5);

      try {
        schema.parse("abc"); // Too short
      } catch (error) {
        expect(isValidationError(error)).toBe(true);
      }
    });

    test(_"should not identify regular errors as validation errors", _() => {
      const regularError = new Error("Regular error");
      expect(isValidationError(regularError)).toBe(false);
    });

    test(_"should not identify non-error values as validation errors", _() => {
      expect(isValidationError("string")).toBe(false);
      expect(isValidationError(null)).toBe(false);
      expect(isValidationError(undefined)).toBe(false);
      expect(isValidationError({})).toBe(false);
    });
  });

  describe(_"extractValidationErrors", _() => {
    test(_"should extract validation errors in standardized format", _() => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
        age: z.number().min(18),
      });

      try {
        schema.parse({
          name: "",
          email: "invalid-email",
          age: 16,
        });
      } catch (error) {
        if (isValidationError(error)) {
          const extractedErrors = extractValidationErrors(error);

          expect(extractedErrors).toHaveLength(3);
          expect(extractedErrors).toEqual(
            expect.arrayContaining([
              expect.objectContaining({
                field: "name",
                message: expect.stringContaining("String must contain at least 1 character"),
                code: "too_small",
              }),
              expect.objectContaining({
                field: "email",
                message: "Invalid email",
                code: "invalid_string",
              }),
              expect.objectContaining({
                field: "age",
                message: "Number must be greater than or equal to 18",
                code: "too_small",
              }),
            ])
          );
        }
      }
    });

    test(_"should handle nested field paths", _() => {
      const schema = z.object({
        user: z.object({
          profile: z.object({
            name: z.string().min(1),
          }),
        }),
      });

      try {
        schema.parse({
          user: {
            profile: {
              name: "",
            },
          },
        });
      } catch (error) {
        if (isValidationError(error)) {
          const extractedErrors = extractValidationErrors(error);

          expect(extractedErrors).toHaveLength(1);
          expect(extractedErrors[0].field).toBe("user.profile.name");
        }
      }
    });

    test(_"should handle array field paths", _() => {
      const schema = z.object({
        items: z.array(
          z.object({
            name: z.string().min(1),
          })
        ),
      });

      try {
        schema.parse({
          items: [{ name: "" }, { name: "valid" }, { name: "" }],
        });
      } catch (error) {
        if (isValidationError(error)) {
          const extractedErrors = extractValidationErrors(error);

          expect(extractedErrors).toHaveLength(2);
          expect(extractedErrors[0].field).toBe("items.0.name");
          expect(extractedErrors[1].field).toBe("items.2.name");
        }
      }
    });
  });

  describe(_"Type transformation tests", _() => {
    test(_"should transform string to number", _() => {
      const schema = z.string().transform(val => parseInt(val, 10));
      const result = schema.parse("123");
      expect(result).toBe(123);
      expect(typeof result).toBe("number");
    });

    test(_"should transform and validate email", _() => {
      const schema = z
        .string()
        .email()
        .transform(val => val.toLowerCase());
      const result = schema.parse("USER@EXAMPLE.COM");
      expect(result).toBe("user@example.com");
    });

    test(_"should transform array of strings to numbers", _() => {
      const schema = z.array(z.string().transform(val => parseInt(val, 10)));
      const result = schema.parse(["1", "2", "3"]);
      expect(result).toEqual([1, 2, 3]);
    });

    test(_"should transform nested object properties", _() => {
      const schema = z.object({
        user: z.object({
          name: z.string().transform(val => val.trim().toLowerCase()),
          age: z.string().transform(val => parseInt(val, 10)),
        }),
      });

      const result = schema.parse({
        user: {
          name: "  JOHN DOE  ",
          age: "25",
        },
      });

      expect(result).toEqual({
        user: {
          name: "john doe",
          age: 25,
        },
      });
    });

    test(_"should handle optional transformations", _() => {
      const schema = z.object({
        name: z.string(),
        age: z
          .string()
          .transform(val => parseInt(val, 10))
          .optional(),
      });

      const result1 = schema.parse({ name: "John", age: "25" });
      expect(result1).toEqual({ name: "John", age: 25 });

      const result2 = schema.parse({ name: "John" });
      expect(result2).toEqual({ name: "John" });
    });

    test(_"should validate transformed values", _() => {
      const schema = z
        .string()
        .transform(val => parseInt(val, 10))
        .refine(val => val > 0, {
          message: "Must be positive",
        });

      expect(schema.parse("5")).toBe(5);
      expect_(() => schema.parse("-5")).toThrow("Must be positive");
      expect_(() => schema.parse("0")).toThrow("Must be positive");
    });

    test(_"should handle complex business logic transformations", _() => {
      const priceSchema = z.object({
        amount: z.string().transform(val => Math.round(parseFloat(val) * 100)), // Convert dollars to cents
        currency: z.string().default("USD"),
      });

      const result = priceSchema.parse({ amount: "29.99" });
      expect(result).toEqual({
        amount: 2999, // $29.99 in cents
        currency: "USD",
      });
    });

    test(_"should validate BroLab-specific transformations", _() => {
      const beatSchema = z.object({
        title: z.string().transform(val => val.trim()),
        slug: z.string().transform(val => val.toLowerCase().replace(/\s+/g, "-")),
        bpm: z.string().transform(val => parseInt(val, 10)),
        price: z.string().transform(val => Math.round(parseFloat(val) * 100)),
      });

      const result = beatSchema.parse({
        title: "  Dark Trap Beat  ",
        slug: "Dark Trap Beat",
        bpm: "140",
        price: "49.99",
      });

      expect(result).toEqual({
        title: "Dark Trap Beat",
        slug: "dark-trap-beat",
        bpm: 140,
        price: 4999,
      });
    });
  });
});
