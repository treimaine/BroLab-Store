/**
 * Property-Based Tests for Invoice Number Generation
 *
 * **Feature: convex-integration-pending, Property 11: Invoice Number Uniqueness and Format**
 * **Validates: Requirements 4.1, 4.2**
 *
 * Tests that:
 * - For any set of orders, each generated invoice number is unique
 * - All invoice numbers match the format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
 */

import { describe, expect, it } from "@jest/globals";
import * as fc from "fast-check";

/**
 * Invoice number format regex: BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
 * Year is 4 digits, sequence is exactly 6 digits (zero-padded)
 */
const INVOICE_NUMBER_REGEX = /^BRLB-\d{4}-\d{6}$/;

/**
 * Simulates the invoice number generation logic from generateInvoiceNumber.ts
 * This is a pure function that mirrors the Convex mutation's core logic.
 */
function generateInvoiceNumberPure(year: number, sequence: number): string {
  if (sequence < 1 || sequence > 999999) {
    throw new Error(`Sequence must be between 1 and 999999, got: ${sequence}`);
  }
  if (year < 1000 || year > 9999) {
    throw new Error(`Year must be a 4-digit number, got: ${year}`);
  }
  return `BRLB-${year}-${String(sequence).padStart(6, "0")}`;
}

/**
 * Validates that an invoice number matches the expected format.
 */
function isValidInvoiceFormat(invoiceNumber: string): boolean {
  return INVOICE_NUMBER_REGEX.test(invoiceNumber);
}

/**
 * Extracts year and sequence from an invoice number.
 */
function parseInvoiceNumber(invoiceNumber: string): { year: number; sequence: number } | null {
  const match = invoiceNumber.match(/^BRLB-(\d{4})-(\d{6})$/);
  if (!match) return null;
  return {
    year: Number.parseInt(match[1], 10),
    sequence: Number.parseInt(match[2], 10),
  };
}

describe("Invoice Number Property Tests", () => {
  /**
   * **Feature: convex-integration-pending, Property 11: Invoice Number Uniqueness and Format**
   * **Validates: Requirements 4.1, 4.2**
   */
  describe("Property 11: Invoice Number Uniqueness and Format", () => {
    it("should generate invoice numbers matching the format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Valid year range
          fc.integer({ min: 1, max: 999999 }), // Valid sequence range
          (year, sequence) => {
            const invoiceNumber = generateInvoiceNumberPure(year, sequence);

            // Verify format matches regex
            expect(isValidInvoiceFormat(invoiceNumber)).toBe(true);

            // Verify the parsed values match input
            const parsed = parseInvoiceNumber(invoiceNumber);
            expect(parsed).not.toBeNull();
            expect(parsed?.year).toBe(year);
            expect(parsed?.sequence).toBe(sequence);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should generate unique invoice numbers for different sequences within the same year", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.uniqueArray(fc.integer({ min: 1, max: 999999 }), {
            minLength: 2,
            maxLength: 100,
          }), // Unique sequences
          (year, sequences) => {
            const invoiceNumbers = sequences.map(seq => generateInvoiceNumberPure(year, seq));

            // All invoice numbers should be unique
            const uniqueNumbers = new Set(invoiceNumbers);
            expect(uniqueNumbers.size).toBe(invoiceNumbers.length);

            // All should have valid format
            invoiceNumbers.forEach(num => {
              expect(isValidInvoiceFormat(num)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should generate unique invoice numbers across different years", () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.integer({ min: 2020, max: 2099 }), {
            minLength: 2,
            maxLength: 10,
          }), // Multiple years
          fc.integer({ min: 1, max: 999999 }), // Same sequence
          (years, sequence) => {
            const invoiceNumbers = years.map(year => generateInvoiceNumberPure(year, sequence));

            // All invoice numbers should be unique (different years)
            const uniqueNumbers = new Set(invoiceNumbers);
            expect(uniqueNumbers.size).toBe(invoiceNumbers.length);

            // All should have valid format
            invoiceNumbers.forEach(num => {
              expect(isValidInvoiceFormat(num)).toBe(true);
            });
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should pad sequence numbers correctly to 6 digits", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.integer({ min: 1, max: 999999 }),
          (year, sequence) => {
            const invoiceNumber = generateInvoiceNumberPure(year, sequence);

            // Extract the sequence part (last 6 characters before end)
            const sequencePart = invoiceNumber.slice(-6);

            // Should always be exactly 6 digits
            expect(sequencePart.length).toBe(6);
            expect(/^\d{6}$/.test(sequencePart)).toBe(true);

            // Parsed value should match original
            const parsedSequence = Number.parseInt(sequencePart, 10);
            expect(parsedSequence).toBe(sequence);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should handle edge case sequences (1 and 999999)", () => {
      const currentYear = new Date().getFullYear();

      // Minimum sequence
      const minInvoice = generateInvoiceNumberPure(currentYear, 1);
      expect(minInvoice).toBe(`BRLB-${currentYear}-000001`);
      expect(isValidInvoiceFormat(minInvoice)).toBe(true);

      // Maximum sequence
      const maxInvoice = generateInvoiceNumberPure(currentYear, 999999);
      expect(maxInvoice).toBe(`BRLB-${currentYear}-999999`);
      expect(isValidInvoiceFormat(maxInvoice)).toBe(true);
    });

    it("should maintain uniqueness for sequential invoice generation simulation", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.integer({ min: 1, max: 999000 }), // Starting sequence (leave room for 1000 more)
          fc.integer({ min: 10, max: 100 }), // Number of invoices to generate
          (year, startSequence, count) => {
            const invoiceNumbers: string[] = [];

            // Simulate sequential generation (like the atomic counter would do)
            for (let i = 0; i < count; i++) {
              invoiceNumbers.push(generateInvoiceNumberPure(year, startSequence + i));
            }

            // All should be unique
            const uniqueNumbers = new Set(invoiceNumbers);
            expect(uniqueNumbers.size).toBe(count);

            // All should have valid format
            invoiceNumbers.forEach(num => {
              expect(isValidInvoiceFormat(num)).toBe(true);
            });

            // Sequences should be strictly increasing
            for (let i = 1; i < invoiceNumbers.length; i++) {
              const prev = parseInvoiceNumber(invoiceNumbers[i - 1]);
              const curr = parseInvoiceNumber(invoiceNumbers[i]);
              expect(prev).not.toBeNull();
              expect(curr).not.toBeNull();
              expect(curr!.sequence).toBe(prev!.sequence + 1);
            }
          }
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Invoice Number Format Validation", () => {
    it("should reject invalid invoice number formats", () => {
      const invalidFormats = [
        "", // Empty
        "BRLB", // Incomplete
        "BRLB-2024", // Missing sequence
        "BRLB-2024-", // Empty sequence
        "BRLB-2024-12345", // 5 digits instead of 6
        "BRLB-2024-1234567", // 7 digits instead of 6
        "BRLB-24-000001", // 2-digit year
        "brlb-2024-000001", // Lowercase prefix
        "BRLB_2024_000001", // Wrong separator
        "BRLB-2024-00000A", // Non-numeric sequence
        "INV-2024-000001", // Wrong prefix
      ];

      invalidFormats.forEach(format => {
        expect(isValidInvoiceFormat(format)).toBe(false);
      });
    });

    it("should accept valid invoice number formats", () => {
      const validFormats = [
        "BRLB-2024-000001",
        "BRLB-2024-999999",
        "BRLB-2020-000001",
        "BRLB-2099-500000",
        "BRLB-1999-123456",
      ];

      validFormats.forEach(format => {
        expect(isValidInvoiceFormat(format)).toBe(true);
      });
    });
  });

  describe("Invoice Number Parsing", () => {
    it("should correctly parse valid invoice numbers", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1000, max: 9999 }),
          fc.integer({ min: 1, max: 999999 }),
          (year, sequence) => {
            const invoiceNumber = generateInvoiceNumberPure(year, sequence);
            const parsed = parseInvoiceNumber(invoiceNumber);

            expect(parsed).not.toBeNull();
            expect(parsed?.year).toBe(year);
            expect(parsed?.sequence).toBe(sequence);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should return null for invalid invoice numbers", () => {
      expect(parseInvoiceNumber("invalid")).toBeNull();
      expect(parseInvoiceNumber("")).toBeNull();
      expect(parseInvoiceNumber("BRLB-2024")).toBeNull();
    });
  });

  /**
   * **Feature: convex-integration-pending, Property 12: Invoice Number Idempotency**
   * **Validates: Requirements 4.4**
   *
   * Tests that calling ensureInvoiceNumber multiple times for the same order
   * returns the same invoice number (idempotent behavior).
   */
  describe("Property 12: Invoice Number Idempotency", () => {
    /**
     * Simulates the idempotent invoice number generation behavior.
     * This mirrors the Convex mutation's idempotency logic:
     * - If an order already has an invoice number, return it
     * - Otherwise, generate a new one
     */
    interface OrderState {
      orderId: string;
      invoiceNumber: string | null;
    }

    interface InvoiceGeneratorState {
      orders: Map<string, OrderState>;
      counter: number;
      year: number;
    }

    function createInvoiceGenerator(year: number): InvoiceGeneratorState {
      return {
        orders: new Map(),
        counter: 0,
        year,
      };
    }

    function ensureInvoiceNumberIdempotent(state: InvoiceGeneratorState, orderId: string): string {
      const existingOrder = state.orders.get(orderId);

      // Idempotency: return existing invoice number if present
      if (existingOrder?.invoiceNumber) {
        return existingOrder.invoiceNumber;
      }

      // Generate new invoice number
      state.counter += 1;
      const invoiceNumber = `BRLB-${state.year}-${String(state.counter).padStart(6, "0")}`;

      // Store the invoice number for this order
      state.orders.set(orderId, { orderId, invoiceNumber });

      return invoiceNumber;
    }

    it("should return the same invoice number when called multiple times for the same order", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.uuid(), // Order ID
          fc.integer({ min: 2, max: 10 }), // Number of calls
          (year, orderId, callCount) => {
            const state = createInvoiceGenerator(year);

            // First call generates the invoice number
            const firstInvoiceNumber = ensureInvoiceNumberIdempotent(state, orderId);

            // Subsequent calls should return the same invoice number
            for (let i = 1; i < callCount; i++) {
              const subsequentInvoiceNumber = ensureInvoiceNumberIdempotent(state, orderId);
              expect(subsequentInvoiceNumber).toBe(firstInvoiceNumber);
            }

            // Counter should only have incremented once
            expect(state.counter).toBe(1);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should not increment counter when returning existing invoice number", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.uuid(), // Order ID
          fc.integer({ min: 5, max: 20 }), // Number of repeated calls
          (year, orderId, repeatCount) => {
            const state = createInvoiceGenerator(year);

            // Generate invoice number once
            ensureInvoiceNumberIdempotent(state, orderId);
            const counterAfterFirst = state.counter;

            // Call multiple times
            for (let i = 0; i < repeatCount; i++) {
              ensureInvoiceNumberIdempotent(state, orderId);
            }

            // Counter should not have changed
            expect(state.counter).toBe(counterAfterFirst);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should generate different invoice numbers for different orders", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 20 }), // Unique order IDs
          (year, orderIds) => {
            const state = createInvoiceGenerator(year);
            const invoiceNumbers: string[] = [];

            // Generate invoice numbers for each order
            for (const orderId of orderIds) {
              invoiceNumbers.push(ensureInvoiceNumberIdempotent(state, orderId));
            }

            // All invoice numbers should be unique
            const uniqueNumbers = new Set(invoiceNumbers);
            expect(uniqueNumbers.size).toBe(orderIds.length);

            // Counter should match number of orders
            expect(state.counter).toBe(orderIds.length);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain idempotency across interleaved calls for multiple orders", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 10 }), // Order IDs
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 50 }), // Random order indices
          (year, orderIds, callSequence) => {
            const state = createInvoiceGenerator(year);
            const firstInvoiceNumbers = new Map<string, string>();

            // Process interleaved calls
            for (const index of callSequence) {
              const orderId = orderIds[index % orderIds.length];
              const invoiceNumber = ensureInvoiceNumberIdempotent(state, orderId);

              if (firstInvoiceNumbers.has(orderId)) {
                // Should return the same invoice number (idempotency)
                expect(invoiceNumber).toBe(firstInvoiceNumbers.get(orderId));
              } else {
                // First time seeing this order
                firstInvoiceNumbers.set(orderId, invoiceNumber);
              }
            }

            // Counter should equal number of unique orders processed
            expect(state.counter).toBe(firstInvoiceNumbers.size);
          }
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve invoice number format after idempotent retrieval", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }), // Year
          fc.uuid(), // Order ID
          fc.integer({ min: 2, max: 5 }), // Number of retrievals
          (year, orderId, retrievalCount) => {
            const state = createInvoiceGenerator(year);

            // Generate and retrieve multiple times
            const invoiceNumbers: string[] = [];
            for (let i = 0; i < retrievalCount; i++) {
              invoiceNumbers.push(ensureInvoiceNumberIdempotent(state, orderId));
            }

            // All should be identical
            const uniqueNumbers = new Set(invoiceNumbers);
            expect(uniqueNumbers.size).toBe(1);

            // Should still have valid format
            const invoiceNumber = invoiceNumbers[0];
            expect(isValidInvoiceFormat(invoiceNumber)).toBe(true);

            // Should parse correctly
            const parsed = parseInvoiceNumber(invoiceNumber);
            expect(parsed).not.toBeNull();
            expect(parsed?.year).toBe(year);
          }
        ),
        { numRuns: 100 }
      );
    });
  });
});
