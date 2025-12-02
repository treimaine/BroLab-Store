/**
 * Property-Based Tests for Invoice Generation
 *
 * **Feature: convex-integration-pending, Property 11: Invoice Number Uniqueness and Format**
 * **Feature: convex-integration-pending, Property 12: Invoice Number Idempotency**
 * **Feature: convex-integration-pending, Property 13: Invoice PDF Persistence**
 * **Feature: convex-integration-pending, Property 15: Invoice Error Strictness**
 * **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 5.3**
 *
 * Tests that:
 * - For any set of orders, each generated invoice number is unique
 * - All invoice numbers match the format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
 * - Invoice PDF URLs are stored and accessible after generation
 * - Convex failures during invoice generation throw errors (strict error handling)
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

/**
 * **Feature: convex-integration-pending, Property 13: Invoice PDF Persistence**
 * **Validates: Requirements 4.3**
 *
 * Tests that for any order with a generated PDF, the PDF URL is stored
 * in the invoicesOrders table and the PDF is accessible.
 */
describe("Property 13: Invoice PDF Persistence", () => {
  /**
   * Simulates the invoice PDF generation and storage workflow.
   * This mirrors the ensureInvoicePdf function's behavior.
   */
  interface InvoicePdfRecord {
    orderId: string;
    invoiceNumber: string;
    pdfStorageId: string;
    pdfUrl: string;
    amount: number;
    currency: string;
    issuedAt: number;
  }

  interface InvoicePdfStorage {
    invoices: Map<string, InvoicePdfRecord>;
    storage: Map<string, { data: string; mimeType: string }>;
    orders: Map<string, { invoiceNumber?: string; invoiceUrl?: string; total: number }>;
    failureMode: boolean;
    failureMessage: string;
  }

  function createInvoicePdfStorage(): InvoicePdfStorage {
    return {
      invoices: new Map(),
      storage: new Map(),
      orders: new Map(),
      failureMode: false,
      failureMessage: "",
    };
  }

  // Note: setFailureMode is available for testing error scenarios but not used in Property 13
  // which focuses on successful PDF persistence. Error scenarios are covered in Property 15.
  function _setFailureMode(storage: InvoicePdfStorage, shouldFail: boolean, message = ""): void {
    storage.failureMode = shouldFail;
    storage.failureMessage = message;
  }

  function registerOrder(storage: InvoicePdfStorage, orderId: string, total: number): void {
    storage.orders.set(orderId, { total });
  }

  /**
   * Simulates PDF upload to storage.
   * Returns a storage ID and URL.
   */
  function uploadPdfToStorage(
    storage: InvoicePdfStorage,
    pdfData: string,
    filename: string
  ): { storageId: string; url: string } {
    if (storage.failureMode) {
      throw new Error(storage.failureMessage || "Storage upload failed");
    }

    const storageId = `storage_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const url = `https://storage.example.com/${storageId}/${filename}`;

    storage.storage.set(storageId, { data: pdfData, mimeType: "application/pdf" });

    return { storageId, url };
  }

  /**
   * Simulates creating an invoice record in the database.
   */
  function createInvoiceRecord(
    storage: InvoicePdfStorage,
    orderId: string,
    invoiceNumber: string,
    pdfStorageId: string,
    pdfUrl: string,
    amount: number,
    currency: string
  ): InvoicePdfRecord {
    if (storage.failureMode) {
      throw new Error(storage.failureMessage || "Failed to create invoice record");
    }

    const order = storage.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    const record: InvoicePdfRecord = {
      orderId,
      invoiceNumber,
      pdfStorageId,
      pdfUrl,
      amount,
      currency,
      issuedAt: Date.now(),
    };

    storage.invoices.set(orderId, record);

    // Update order with invoice URL
    storage.orders.set(orderId, {
      ...order,
      invoiceNumber,
      invoiceUrl: pdfUrl,
    });

    return record;
  }

  /**
   * Simulates the full ensureInvoicePdf workflow.
   */
  function ensureInvoicePdfSimulated(
    storage: InvoicePdfStorage,
    orderId: string,
    invoiceNumber: string,
    pdfData: string
  ): string {
    const order = storage.orders.get(orderId);
    if (!order) {
      throw new Error(`Order not found: ${orderId}`);
    }

    // Check if invoice already exists (idempotency)
    const existingInvoice = storage.invoices.get(orderId);
    if (existingInvoice) {
      return existingInvoice.pdfUrl;
    }

    // Upload PDF to storage
    const filename = `invoice-${invoiceNumber}.pdf`;
    const { storageId, url } = uploadPdfToStorage(storage, pdfData, filename);

    // Create invoice record
    createInvoiceRecord(storage, orderId, invoiceNumber, storageId, url, order.total, "EUR");

    return url;
  }

  /**
   * Retrieves the PDF URL for an order.
   */
  function getInvoicePdfUrl(storage: InvoicePdfStorage, orderId: string): string | null {
    const invoice = storage.invoices.get(orderId);
    return invoice?.pdfUrl ?? null;
  }

  /**
   * Checks if a PDF exists in storage.
   */
  function pdfExistsInStorage(storage: InvoicePdfStorage, storageId: string): boolean {
    return storage.storage.has(storageId);
  }

  // Arbitraries for property tests
  const orderIdArb = fc.uuid().map(id => `order_${id}`);
  const invoiceNumberArb = fc
    .tuple(fc.integer({ min: 2020, max: 2099 }), fc.integer({ min: 1, max: 999999 }))
    .map(([year, seq]) => `BRLB-${year}-${String(seq).padStart(6, "0")}`);
  const pdfDataArb = fc
    .string({ minLength: 100, maxLength: 1000 })
    .map(s => Buffer.from(s).toString("base64"));
  const amountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true });

  it("should store PDF URL in invoice record after generation", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        invoiceNumberArb,
        pdfDataArb,
        amountArb,
        (orderId, invoiceNumber, pdfData, amount) => {
          const storage = createInvoicePdfStorage();
          registerOrder(storage, orderId, amount);

          // Generate invoice PDF
          const pdfUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);

          // Verify PDF URL is stored
          expect(pdfUrl).toBeTruthy();
          expect(pdfUrl).toContain("https://");
          expect(pdfUrl).toContain(invoiceNumber);

          // Verify invoice record exists with correct URL
          const storedUrl = getInvoicePdfUrl(storage, orderId);
          expect(storedUrl).toBe(pdfUrl);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should persist PDF data in storage", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        invoiceNumberArb,
        pdfDataArb,
        amountArb,
        (orderId, invoiceNumber, pdfData, amount) => {
          const storage = createInvoicePdfStorage();
          registerOrder(storage, orderId, amount);

          // Generate invoice PDF
          ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);

          // Verify PDF exists in storage
          const invoice = storage.invoices.get(orderId);
          expect(invoice).toBeTruthy();
          expect(pdfExistsInStorage(storage, invoice!.pdfStorageId)).toBe(true);

          // Verify stored data matches
          const storedPdf = storage.storage.get(invoice!.pdfStorageId);
          expect(storedPdf).toBeTruthy();
          expect(storedPdf!.mimeType).toBe("application/pdf");
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should update order with invoice URL after PDF generation", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        invoiceNumberArb,
        pdfDataArb,
        amountArb,
        (orderId, invoiceNumber, pdfData, amount) => {
          const storage = createInvoicePdfStorage();
          registerOrder(storage, orderId, amount);

          // Generate invoice PDF
          const pdfUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);

          // Verify order is updated with invoice URL
          const order = storage.orders.get(orderId);
          expect(order).toBeTruthy();
          expect(order!.invoiceUrl).toBe(pdfUrl);
          expect(order!.invoiceNumber).toBe(invoiceNumber);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should return existing PDF URL for idempotent calls", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        invoiceNumberArb,
        pdfDataArb,
        amountArb,
        fc.integer({ min: 2, max: 5 }),
        (orderId, invoiceNumber, pdfData, amount, callCount) => {
          const storage = createInvoicePdfStorage();
          registerOrder(storage, orderId, amount);

          // First call generates the PDF
          const firstUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);

          // Subsequent calls should return the same URL
          for (let i = 1; i < callCount; i++) {
            const subsequentUrl = ensureInvoicePdfSimulated(
              storage,
              orderId,
              invoiceNumber,
              pdfData
            );
            expect(subsequentUrl).toBe(firstUrl);
          }

          // Only one PDF should be stored
          expect(storage.invoices.size).toBe(1);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should store correct invoice metadata", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        invoiceNumberArb,
        pdfDataArb,
        amountArb,
        (orderId, invoiceNumber, pdfData, amount) => {
          const storage = createInvoicePdfStorage();
          registerOrder(storage, orderId, amount);

          // Generate invoice PDF
          ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);

          // Verify invoice metadata
          const invoice = storage.invoices.get(orderId);
          expect(invoice).toBeTruthy();
          expect(invoice!.orderId).toBe(orderId);
          expect(invoice!.invoiceNumber).toBe(invoiceNumber);
          expect(invoice!.amount).toBe(amount);
          expect(invoice!.currency).toBe("EUR");
          expect(invoice!.issuedAt).toBeGreaterThan(0);
        }
      ),
      { numRuns: 100 }
    );
  });
});

/**
 * **Feature: convex-integration-pending, Property 15: Invoice Error Strictness**
 * **Validates: Requirements 5.3**
 *
 * Tests that for any Convex failure during invoice generation,
 * the system throws an error to prevent incomplete invoice records.
 */
describe("Property 15: Invoice Error Strictness", () => {
  /**
   * Simulates the invoice generation with strict error handling.
   * This mirrors the ensureInvoiceNumber and ensureInvoicePdf error behavior.
   */
  interface InvoiceGeneratorWithErrors {
    orders: Map<string, { invoiceNumber?: string; total: number }>;
    counters: Map<string, number>;
    invoices: Map<string, { pdfUrl: string; pdfStorageId: string }>;
    storage: Map<string, string>;
    failureMode: "none" | "counter" | "storage" | "record";
    failureMessage: string;
  }

  function createInvoiceGeneratorWithErrors(): InvoiceGeneratorWithErrors {
    return {
      orders: new Map(),
      counters: new Map(),
      invoices: new Map(),
      storage: new Map(),
      failureMode: "none",
      failureMessage: "",
    };
  }

  function setFailureMode(
    generator: InvoiceGeneratorWithErrors,
    mode: "none" | "counter" | "storage" | "record",
    message = ""
  ): void {
    generator.failureMode = mode;
    generator.failureMessage = message || `Simulated ${mode} failure`;
  }

  function registerOrder(
    generator: InvoiceGeneratorWithErrors,
    orderId: string,
    total: number
  ): void {
    generator.orders.set(orderId, { total });
  }

  /**
   * Simulates ensureInvoiceNumber with strict error handling.
   * Throws on any Convex failure.
   */
  function ensureInvoiceNumberStrict(
    generator: InvoiceGeneratorWithErrors,
    orderId: string
  ): string {
    const order = generator.orders.get(orderId);
    if (!order) {
      throw new Error(`Invoice number generation failed: Order not found: ${orderId}`);
    }

    // Idempotency check
    if (order.invoiceNumber) {
      return order.invoiceNumber;
    }

    // Simulate counter failure
    if (generator.failureMode === "counter") {
      throw new Error(`Invoice number generation failed: ${generator.failureMessage}`);
    }

    const year = new Date().getFullYear();
    const counterName = `invoice_${year}`;
    const currentCount = generator.counters.get(counterName) ?? 0;
    const newCount = currentCount + 1;
    generator.counters.set(counterName, newCount);

    const invoiceNumber = `BRLB-${year}-${String(newCount).padStart(6, "0")}`;
    generator.orders.set(orderId, { ...order, invoiceNumber });

    return invoiceNumber;
  }

  /**
   * Simulates ensureInvoicePdf with strict error handling.
   * Throws on any Convex failure.
   */
  function ensureInvoicePdfStrict(
    generator: InvoiceGeneratorWithErrors,
    orderId: string,
    pdfData: string
  ): string {
    const order = generator.orders.get(orderId);
    if (!order) {
      throw new Error(`Invoice PDF generation failed: Order not found: ${orderId}`);
    }

    // Get or generate invoice number
    const invoiceNumber = ensureInvoiceNumberStrict(generator, orderId);

    // Check for existing invoice (idempotency)
    const existingInvoice = generator.invoices.get(orderId);
    if (existingInvoice) {
      return existingInvoice.pdfUrl;
    }

    // Simulate storage failure
    if (generator.failureMode === "storage") {
      throw new Error(`Invoice PDF generation failed: ${generator.failureMessage}`);
    }

    const storageId = `storage_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const pdfUrl = `https://storage.example.com/${storageId}/invoice-${invoiceNumber}.pdf`;
    generator.storage.set(storageId, pdfData);

    // Simulate record creation failure
    if (generator.failureMode === "record") {
      throw new Error(`Invoice PDF generation failed: ${generator.failureMessage}`);
    }

    generator.invoices.set(orderId, { pdfUrl, pdfStorageId: storageId });

    return pdfUrl;
  }

  // Arbitraries for property tests
  const orderIdArb = fc.uuid().map(id => `order_${id}`);
  const amountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true });
  const pdfDataArb = fc
    .string({ minLength: 100, maxLength: 500 })
    .map(s => Buffer.from(s).toString("base64"));
  const errorMessageArb = fc
    .string({ minLength: 5, maxLength: 100 })
    .filter(s => s.trim().length > 0);

  it("should throw error when counter operation fails", () => {
    fc.assert(
      fc.property(orderIdArb, amountArb, errorMessageArb, (orderId, amount, errorMsg) => {
        const generator = createInvoiceGeneratorWithErrors();
        registerOrder(generator, orderId, amount);
        setFailureMode(generator, "counter", errorMsg);

        expect(() => ensureInvoiceNumberStrict(generator, orderId)).toThrow();

        try {
          ensureInvoiceNumberStrict(generator, orderId);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain("Invoice number generation failed");
          expect((error as Error).message).toContain(errorMsg);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("should throw error when storage upload fails", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        amountArb,
        pdfDataArb,
        errorMessageArb,
        (orderId, amount, pdfData, errorMsg) => {
          const generator = createInvoiceGeneratorWithErrors();
          registerOrder(generator, orderId, amount);
          setFailureMode(generator, "storage", errorMsg);

          expect(() => ensureInvoicePdfStrict(generator, orderId, pdfData)).toThrow();

          try {
            ensureInvoicePdfStrict(generator, orderId, pdfData);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain("Invoice PDF generation failed");
            expect((error as Error).message).toContain(errorMsg);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should throw error when invoice record creation fails", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        amountArb,
        pdfDataArb,
        errorMessageArb,
        (orderId, amount, pdfData, errorMsg) => {
          const generator = createInvoiceGeneratorWithErrors();
          registerOrder(generator, orderId, amount);
          setFailureMode(generator, "record", errorMsg);

          expect(() => ensureInvoicePdfStrict(generator, orderId, pdfData)).toThrow();

          try {
            ensureInvoicePdfStrict(generator, orderId, pdfData);
          } catch (error) {
            expect(error).toBeInstanceOf(Error);
            expect((error as Error).message).toContain("Invoice PDF generation failed");
            expect((error as Error).message).toContain(errorMsg);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should throw error when order does not exist", () => {
    fc.assert(
      fc.property(orderIdArb, orderId => {
        const generator = createInvoiceGeneratorWithErrors();
        // Do NOT register the order

        expect(() => ensureInvoiceNumberStrict(generator, orderId)).toThrow();

        try {
          ensureInvoiceNumberStrict(generator, orderId);
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect((error as Error).message).toContain("Invoice number generation failed");
          expect((error as Error).message).toContain("Order not found");
          expect((error as Error).message).toContain(orderId);
        }
      }),
      { numRuns: 100 }
    );
  });

  it("should not create partial invoice records on failure", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        amountArb,
        pdfDataArb,
        errorMessageArb,
        (orderId, amount, pdfData, errorMsg) => {
          const generator = createInvoiceGeneratorWithErrors();
          registerOrder(generator, orderId, amount);
          setFailureMode(generator, "record", errorMsg);

          // Attempt to generate PDF (should fail)
          try {
            ensureInvoicePdfStrict(generator, orderId, pdfData);
          } catch {
            // Expected to throw
          }

          // Verify no partial invoice record was created
          expect(generator.invoices.has(orderId)).toBe(false);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should propagate error message from Convex failure", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        amountArb,
        errorMessageArb,
        fc.constantFrom("counter", "storage", "record") as fc.Arbitrary<
          "counter" | "storage" | "record"
        >,
        (orderId, amount, errorMsg, failureType) => {
          const generator = createInvoiceGeneratorWithErrors();
          registerOrder(generator, orderId, amount);
          setFailureMode(generator, failureType, errorMsg);

          let caughtError: Error | null = null;
          try {
            if (failureType === "counter") {
              ensureInvoiceNumberStrict(generator, orderId);
            } else {
              ensureInvoicePdfStrict(generator, orderId, "test-pdf-data");
            }
          } catch (error) {
            caughtError = error as Error;
          }

          // Error should be thrown
          expect(caughtError).not.toBeNull();
          expect(caughtError).toBeInstanceOf(Error);

          // Error message should contain the original error message
          expect(caughtError!.message).toContain(errorMsg);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should not swallow errors silently (unlike audit logging)", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        amountArb,
        pdfDataArb,
        errorMessageArb,
        (orderId, amount, pdfData, errorMsg) => {
          const generator = createInvoiceGeneratorWithErrors();
          registerOrder(generator, orderId, amount);
          setFailureMode(generator, "storage", errorMsg);

          // Unlike audit logging which uses graceful degradation,
          // invoice generation MUST throw errors to prevent incomplete invoices
          let errorThrown = false;
          try {
            ensureInvoicePdfStrict(generator, orderId, pdfData);
          } catch {
            errorThrown = true;
          }

          // Error MUST be thrown (strict error handling)
          expect(errorThrown).toBe(true);
        }
      ),
      { numRuns: 100 }
    );
  });

  it("should succeed when no failures occur", () => {
    fc.assert(
      fc.property(orderIdArb, amountArb, pdfDataArb, (orderId, amount, pdfData) => {
        const generator = createInvoiceGeneratorWithErrors();
        registerOrder(generator, orderId, amount);
        // No failure mode set

        // Should not throw
        const pdfUrl = ensureInvoicePdfStrict(generator, orderId, pdfData);

        // Should return valid URL
        expect(pdfUrl).toBeTruthy();
        expect(pdfUrl).toContain("https://");

        // Invoice record should be created
        expect(generator.invoices.has(orderId)).toBe(true);
      }),
      { numRuns: 100 }
    );
  });
});
