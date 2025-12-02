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

// ============================================================================
// Test Helper Functions - Extracted to reduce nesting depth
// ============================================================================

/**
 * Verifies invoice format and parsed values match input
 */
function verifyInvoiceFormat(year: number, sequence: number): void {
  const invoiceNumber = generateInvoiceNumberPure(year, sequence);
  expect(isValidInvoiceFormat(invoiceNumber)).toBe(true);
  const parsed = parseInvoiceNumber(invoiceNumber);
  expect(parsed).not.toBeNull();
  expect(parsed?.year).toBe(year);
  expect(parsed?.sequence).toBe(sequence);
}

/**
 * Verifies uniqueness of invoice numbers for sequences within same year
 */
function verifyUniqueSequences(year: number, sequences: number[]): void {
  const invoiceNumbers = sequences.map(seq => generateInvoiceNumberPure(year, seq));
  const uniqueNumbers = new Set(invoiceNumbers);
  expect(uniqueNumbers.size).toBe(invoiceNumbers.length);
  for (const num of invoiceNumbers) {
    expect(isValidInvoiceFormat(num)).toBe(true);
  }
}

/**
 * Verifies uniqueness across different years with same sequence
 */
function verifyUniqueYears(years: number[], sequence: number): void {
  const invoiceNumbers = years.map(year => generateInvoiceNumberPure(year, sequence));
  const uniqueNumbers = new Set(invoiceNumbers);
  expect(uniqueNumbers.size).toBe(invoiceNumbers.length);
  for (const num of invoiceNumbers) {
    expect(isValidInvoiceFormat(num)).toBe(true);
  }
}

/**
 * Verifies sequence padding to 6 digits
 */
function verifySequencePadding(year: number, sequence: number): void {
  const invoiceNumber = generateInvoiceNumberPure(year, sequence);
  const sequencePart = invoiceNumber.slice(-6);
  expect(sequencePart.length).toBe(6);
  expect(/^\d{6}$/.test(sequencePart)).toBe(true);
  const parsedSequence = Number.parseInt(sequencePart, 10);
  expect(parsedSequence).toBe(sequence);
}

/**
 * Verifies sequential invoice generation maintains uniqueness and order
 */
function verifySequentialGeneration(year: number, startSequence: number, count: number): void {
  const invoiceNumbers: string[] = [];
  for (let i = 0; i < count; i++) {
    invoiceNumbers.push(generateInvoiceNumberPure(year, startSequence + i));
  }
  const uniqueNumbers = new Set(invoiceNumbers);
  expect(uniqueNumbers.size).toBe(count);
  for (const num of invoiceNumbers) {
    expect(isValidInvoiceFormat(num)).toBe(true);
  }
  for (let i = 1; i < invoiceNumbers.length; i++) {
    const prev = parseInvoiceNumber(invoiceNumbers[i - 1]);
    const curr = parseInvoiceNumber(invoiceNumbers[i]);
    expect(prev).not.toBeNull();
    expect(curr).not.toBeNull();
    expect(curr!.sequence).toBe(prev!.sequence + 1);
  }
}

// ============================================================================
// Idempotency Test Helpers
// ============================================================================

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
  return { orders: new Map(), counter: 0, year };
}

function ensureInvoiceNumberIdempotent(state: InvoiceGeneratorState, orderId: string): string {
  const existingOrder = state.orders.get(orderId);
  if (existingOrder?.invoiceNumber) {
    return existingOrder.invoiceNumber;
  }
  state.counter += 1;
  const invoiceNumber = `BRLB-${state.year}-${String(state.counter).padStart(6, "0")}`;
  state.orders.set(orderId, { orderId, invoiceNumber });
  return invoiceNumber;
}

/**
 * Verifies idempotent behavior for same order
 */
function verifyIdempotentSameOrder(year: number, orderId: string, callCount: number): void {
  const state = createInvoiceGenerator(year);
  const firstInvoiceNumber = ensureInvoiceNumberIdempotent(state, orderId);
  for (let i = 1; i < callCount; i++) {
    const subsequentInvoiceNumber = ensureInvoiceNumberIdempotent(state, orderId);
    expect(subsequentInvoiceNumber).toBe(firstInvoiceNumber);
  }
  expect(state.counter).toBe(1);
}

/**
 * Verifies counter doesn't increment on repeated calls
 */
function verifyCounterNotIncremented(year: number, orderId: string, repeatCount: number): void {
  const state = createInvoiceGenerator(year);
  ensureInvoiceNumberIdempotent(state, orderId);
  const counterAfterFirst = state.counter;
  for (let i = 0; i < repeatCount; i++) {
    ensureInvoiceNumberIdempotent(state, orderId);
  }
  expect(state.counter).toBe(counterAfterFirst);
}

/**
 * Verifies different orders get different invoice numbers
 */
function verifyDifferentOrdersGetDifferentNumbers(year: number, orderIds: string[]): void {
  const state = createInvoiceGenerator(year);
  const invoiceNumbers: string[] = [];
  for (const orderId of orderIds) {
    invoiceNumbers.push(ensureInvoiceNumberIdempotent(state, orderId));
  }
  const uniqueNumbers = new Set(invoiceNumbers);
  expect(uniqueNumbers.size).toBe(orderIds.length);
  expect(state.counter).toBe(orderIds.length);
}

/**
 * Verifies idempotency across interleaved calls
 */
function verifyInterleavedIdempotency(
  year: number,
  orderIds: string[],
  callSequence: number[]
): void {
  const state = createInvoiceGenerator(year);
  const firstInvoiceNumbers = new Map<string, string>();
  for (const index of callSequence) {
    const orderId = orderIds[index % orderIds.length];
    const invoiceNumber = ensureInvoiceNumberIdempotent(state, orderId);
    if (firstInvoiceNumbers.has(orderId)) {
      expect(invoiceNumber).toBe(firstInvoiceNumbers.get(orderId));
    } else {
      firstInvoiceNumbers.set(orderId, invoiceNumber);
    }
  }
  expect(state.counter).toBe(firstInvoiceNumbers.size);
}

/**
 * Verifies format preserved after idempotent retrieval
 */
function verifyFormatPreservedAfterRetrieval(
  year: number,
  orderId: string,
  retrievalCount: number
): void {
  const state = createInvoiceGenerator(year);
  const invoiceNumbers: string[] = [];
  for (let i = 0; i < retrievalCount; i++) {
    invoiceNumbers.push(ensureInvoiceNumberIdempotent(state, orderId));
  }
  const uniqueNumbers = new Set(invoiceNumbers);
  expect(uniqueNumbers.size).toBe(1);
  const invoiceNumber = invoiceNumbers[0];
  expect(isValidInvoiceFormat(invoiceNumber)).toBe(true);
  const parsed = parseInvoiceNumber(invoiceNumber);
  expect(parsed).not.toBeNull();
  expect(parsed?.year).toBe(year);
}

// ============================================================================
// PDF Persistence Test Helpers
// ============================================================================

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

function registerOrderForPdf(storage: InvoicePdfStorage, orderId: string, total: number): void {
  storage.orders.set(orderId, { total });
}

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
  storage.orders.set(orderId, { ...order, invoiceNumber, invoiceUrl: pdfUrl });
  return record;
}

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
  const existingInvoice = storage.invoices.get(orderId);
  if (existingInvoice) {
    return existingInvoice.pdfUrl;
  }
  const filename = `invoice-${invoiceNumber}.pdf`;
  const { storageId, url } = uploadPdfToStorage(storage, pdfData, filename);
  createInvoiceRecord(storage, orderId, invoiceNumber, storageId, url, order.total, "EUR");
  return url;
}

function getInvoicePdfUrl(storage: InvoicePdfStorage, orderId: string): string | null {
  const invoice = storage.invoices.get(orderId);
  return invoice?.pdfUrl ?? null;
}

function pdfExistsInStorage(storage: InvoicePdfStorage, storageId: string): boolean {
  return storage.storage.has(storageId);
}

// PDF Persistence verification helpers
function verifyPdfUrlStored(
  orderId: string,
  invoiceNumber: string,
  pdfData: string,
  amount: number
): void {
  const storage = createInvoicePdfStorage();
  registerOrderForPdf(storage, orderId, amount);
  const pdfUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);
  expect(pdfUrl).toBeTruthy();
  expect(pdfUrl).toContain("https://");
  expect(pdfUrl).toContain(invoiceNumber);
  const storedUrl = getInvoicePdfUrl(storage, orderId);
  expect(storedUrl).toBe(pdfUrl);
}

function verifyPdfDataPersisted(
  orderId: string,
  invoiceNumber: string,
  pdfData: string,
  amount: number
): void {
  const storage = createInvoicePdfStorage();
  registerOrderForPdf(storage, orderId, amount);
  ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);
  const invoice = storage.invoices.get(orderId);
  expect(invoice).toBeTruthy();
  expect(pdfExistsInStorage(storage, invoice!.pdfStorageId)).toBe(true);
  const storedPdf = storage.storage.get(invoice!.pdfStorageId);
  expect(storedPdf).toBeTruthy();
  expect(storedPdf!.mimeType).toBe("application/pdf");
}

function verifyOrderUpdatedWithUrl(
  orderId: string,
  invoiceNumber: string,
  pdfData: string,
  amount: number
): void {
  const storage = createInvoicePdfStorage();
  registerOrderForPdf(storage, orderId, amount);
  const pdfUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);
  const order = storage.orders.get(orderId);
  expect(order).toBeTruthy();
  expect(order!.invoiceUrl).toBe(pdfUrl);
  expect(order!.invoiceNumber).toBe(invoiceNumber);
}

function verifyPdfIdempotency(
  orderId: string,
  invoiceNumber: string,
  pdfData: string,
  amount: number,
  callCount: number
): void {
  const storage = createInvoicePdfStorage();
  registerOrderForPdf(storage, orderId, amount);
  const firstUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);
  for (let i = 1; i < callCount; i++) {
    const subsequentUrl = ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);
    expect(subsequentUrl).toBe(firstUrl);
  }
  expect(storage.invoices.size).toBe(1);
}

function verifyInvoiceMetadata(
  orderId: string,
  invoiceNumber: string,
  pdfData: string,
  amount: number
): void {
  const storage = createInvoicePdfStorage();
  registerOrderForPdf(storage, orderId, amount);
  ensureInvoicePdfSimulated(storage, orderId, invoiceNumber, pdfData);
  const invoice = storage.invoices.get(orderId);
  expect(invoice).toBeTruthy();
  expect(invoice!.orderId).toBe(orderId);
  expect(invoice!.invoiceNumber).toBe(invoiceNumber);
  expect(invoice!.amount).toBe(amount);
  expect(invoice!.currency).toBe("EUR");
  expect(invoice!.issuedAt).toBeGreaterThan(0);
}

// ============================================================================
// Error Strictness Test Helpers
// ============================================================================

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

function registerOrderForErrors(
  generator: InvoiceGeneratorWithErrors,
  orderId: string,
  total: number
): void {
  generator.orders.set(orderId, { total });
}

function ensureInvoiceNumberStrict(generator: InvoiceGeneratorWithErrors, orderId: string): string {
  const order = generator.orders.get(orderId);
  if (!order) {
    throw new Error(`Invoice number generation failed: Order not found: ${orderId}`);
  }
  if (order.invoiceNumber) {
    return order.invoiceNumber;
  }
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

function ensureInvoicePdfStrict(
  generator: InvoiceGeneratorWithErrors,
  orderId: string,
  pdfData: string
): string {
  const order = generator.orders.get(orderId);
  if (!order) {
    throw new Error(`Invoice PDF generation failed: Order not found: ${orderId}`);
  }
  const invoiceNumber = ensureInvoiceNumberStrict(generator, orderId);
  const existingInvoice = generator.invoices.get(orderId);
  if (existingInvoice) {
    return existingInvoice.pdfUrl;
  }
  if (generator.failureMode === "storage") {
    throw new Error(`Invoice PDF generation failed: ${generator.failureMessage}`);
  }
  const storageId = `storage_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  const pdfUrl = `https://storage.example.com/${storageId}/invoice-${invoiceNumber}.pdf`;
  generator.storage.set(storageId, pdfData);
  if (generator.failureMode === "record") {
    throw new Error(`Invoice PDF generation failed: ${generator.failureMessage}`);
  }
  generator.invoices.set(orderId, { pdfUrl, pdfStorageId: storageId });
  return pdfUrl;
}

// Error verification helpers
function verifyCounterFailureThrows(orderId: string, amount: number, errorMsg: string): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
  setFailureMode(generator, "counter", errorMsg);
  expect(() => ensureInvoiceNumberStrict(generator, orderId)).toThrow();
  try {
    ensureInvoiceNumberStrict(generator, orderId);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Invoice number generation failed");
    expect((error as Error).message).toContain(errorMsg);
  }
}

function verifyStorageFailureThrows(
  orderId: string,
  amount: number,
  pdfData: string,
  errorMsg: string
): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
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

function verifyRecordFailureThrows(
  orderId: string,
  amount: number,
  pdfData: string,
  errorMsg: string
): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
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

function verifyOrderNotFoundThrows(orderId: string): void {
  const generator = createInvoiceGeneratorWithErrors();
  expect(() => ensureInvoiceNumberStrict(generator, orderId)).toThrow();
  try {
    ensureInvoiceNumberStrict(generator, orderId);
  } catch (error) {
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain("Invoice number generation failed");
    expect((error as Error).message).toContain("Order not found");
    expect((error as Error).message).toContain(orderId);
  }
}

function verifyNoPartialRecordsOnFailure(
  orderId: string,
  amount: number,
  pdfData: string,
  errorMsg: string
): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
  setFailureMode(generator, "record", errorMsg);
  try {
    ensureInvoicePdfStrict(generator, orderId, pdfData);
  } catch {
    // Expected to throw
  }
  expect(generator.invoices.has(orderId)).toBe(false);
}

function verifyErrorMessagePropagated(
  orderId: string,
  amount: number,
  errorMsg: string,
  failureType: "counter" | "storage" | "record"
): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
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
  expect(caughtError).not.toBeNull();
  expect(caughtError).toBeInstanceOf(Error);
  expect(caughtError!.message).toContain(errorMsg);
}

function verifyErrorNotSwallowed(
  orderId: string,
  amount: number,
  pdfData: string,
  errorMsg: string
): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
  setFailureMode(generator, "storage", errorMsg);
  let errorThrown = false;
  try {
    ensureInvoicePdfStrict(generator, orderId, pdfData);
  } catch {
    errorThrown = true;
  }
  expect(errorThrown).toBe(true);
}

function verifySuccessWithNoFailures(orderId: string, amount: number, pdfData: string): void {
  const generator = createInvoiceGeneratorWithErrors();
  registerOrderForErrors(generator, orderId, amount);
  const pdfUrl = ensureInvoicePdfStrict(generator, orderId, pdfData);
  expect(pdfUrl).toBeTruthy();
  expect(pdfUrl).toContain("https://");
  expect(generator.invoices.has(orderId)).toBe(true);
}

// ============================================================================
// Test Suites
// ============================================================================

describe("Invoice Number Property Tests", () => {
  describe("Property 11: Invoice Number Uniqueness and Format", () => {
    it("should generate invoice numbers matching the format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.integer({ min: 1, max: 999999 }),
          verifyInvoiceFormat
        ),
        { numRuns: 100 }
      );
    });

    it("should generate unique invoice numbers for different sequences within the same year", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.uniqueArray(fc.integer({ min: 1, max: 999999 }), { minLength: 2, maxLength: 100 }),
          verifyUniqueSequences
        ),
        { numRuns: 100 }
      );
    });

    it("should generate unique invoice numbers across different years", () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.integer({ min: 2020, max: 2099 }), { minLength: 2, maxLength: 10 }),
          fc.integer({ min: 1, max: 999999 }),
          verifyUniqueYears
        ),
        { numRuns: 100 }
      );
    });

    it("should pad sequence numbers correctly to 6 digits", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.integer({ min: 1, max: 999999 }),
          verifySequencePadding
        ),
        { numRuns: 100 }
      );
    });

    it("should handle edge case sequences (1 and 999999)", () => {
      const currentYear = new Date().getFullYear();
      const minInvoice = generateInvoiceNumberPure(currentYear, 1);
      expect(minInvoice).toBe(`BRLB-${currentYear}-000001`);
      expect(isValidInvoiceFormat(minInvoice)).toBe(true);
      const maxInvoice = generateInvoiceNumberPure(currentYear, 999999);
      expect(maxInvoice).toBe(`BRLB-${currentYear}-999999`);
      expect(isValidInvoiceFormat(maxInvoice)).toBe(true);
    });

    it("should maintain uniqueness for sequential invoice generation simulation", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.integer({ min: 1, max: 999000 }),
          fc.integer({ min: 10, max: 100 }),
          verifySequentialGeneration
        ),
        { numRuns: 100 }
      );
    });
  });

  describe("Invoice Number Format Validation", () => {
    it("should reject invalid invoice number formats", () => {
      const invalidFormats = [
        "",
        "BRLB",
        "BRLB-2024",
        "BRLB-2024-",
        "BRLB-2024-12345",
        "BRLB-2024-1234567",
        "BRLB-24-000001",
        "brlb-2024-000001",
        "BRLB_2024_000001",
        "BRLB-2024-00000A",
        "INV-2024-000001",
      ];
      for (const format of invalidFormats) {
        expect(isValidInvoiceFormat(format)).toBe(false);
      }
    });

    it("should accept valid invoice number formats", () => {
      const validFormats = [
        "BRLB-2024-000001",
        "BRLB-2024-999999",
        "BRLB-2020-000001",
        "BRLB-2099-500000",
        "BRLB-1999-123456",
      ];
      for (const format of validFormats) {
        expect(isValidInvoiceFormat(format)).toBe(true);
      }
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

  describe("Property 12: Invoice Number Idempotency", () => {
    it("should return the same invoice number when called multiple times for the same order", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.uuid(),
          fc.integer({ min: 2, max: 10 }),
          verifyIdempotentSameOrder
        ),
        { numRuns: 100 }
      );
    });

    it("should not increment counter when returning existing invoice number", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.uuid(),
          fc.integer({ min: 5, max: 20 }),
          verifyCounterNotIncremented
        ),
        { numRuns: 100 }
      );
    });

    it("should generate different invoice numbers for different orders", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 20 }),
          verifyDifferentOrdersGetDifferentNumbers
        ),
        { numRuns: 100 }
      );
    });

    it("should maintain idempotency across interleaved calls for multiple orders", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.uniqueArray(fc.uuid(), { minLength: 2, maxLength: 10 }),
          fc.array(fc.integer({ min: 0, max: 9 }), { minLength: 10, maxLength: 50 }),
          verifyInterleavedIdempotency
        ),
        { numRuns: 100 }
      );
    });

    it("should preserve invoice number format after idempotent retrieval", () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 2020, max: 2099 }),
          fc.uuid(),
          fc.integer({ min: 2, max: 5 }),
          verifyFormatPreservedAfterRetrieval
        ),
        { numRuns: 100 }
      );
    });
  });
});

describe("Property 13: Invoice PDF Persistence", () => {
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
      fc.property(orderIdArb, invoiceNumberArb, pdfDataArb, amountArb, verifyPdfUrlStored),
      { numRuns: 100 }
    );
  });

  it("should persist PDF data in storage", () => {
    fc.assert(
      fc.property(orderIdArb, invoiceNumberArb, pdfDataArb, amountArb, verifyPdfDataPersisted),
      { numRuns: 100 }
    );
  });

  it("should update order with invoice URL after PDF generation", () => {
    fc.assert(
      fc.property(orderIdArb, invoiceNumberArb, pdfDataArb, amountArb, verifyOrderUpdatedWithUrl),
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
        verifyPdfIdempotency
      ),
      { numRuns: 100 }
    );
  });

  it("should store correct invoice metadata", () => {
    fc.assert(
      fc.property(orderIdArb, invoiceNumberArb, pdfDataArb, amountArb, verifyInvoiceMetadata),
      { numRuns: 100 }
    );
  });
});

describe("Property 15: Invoice Error Strictness", () => {
  const orderIdArb = fc.uuid().map(id => `order_${id}`);
  const amountArb = fc.float({ min: Math.fround(0.01), max: Math.fround(10000), noNaN: true });
  const pdfDataArb = fc
    .string({ minLength: 100, maxLength: 500 })
    .map(s => Buffer.from(s).toString("base64"));
  const errorMessageArb = fc
    .string({ minLength: 5, maxLength: 100 })
    .filter(s => s.trim().length > 0);

  it("should throw error when counter operation fails", () => {
    fc.assert(fc.property(orderIdArb, amountArb, errorMessageArb, verifyCounterFailureThrows), {
      numRuns: 100,
    });
  });

  it("should throw error when storage upload fails", () => {
    fc.assert(
      fc.property(orderIdArb, amountArb, pdfDataArb, errorMessageArb, verifyStorageFailureThrows),
      { numRuns: 100 }
    );
  });

  it("should throw error when invoice record creation fails", () => {
    fc.assert(
      fc.property(orderIdArb, amountArb, pdfDataArb, errorMessageArb, verifyRecordFailureThrows),
      { numRuns: 100 }
    );
  });

  it("should throw error when order does not exist", () => {
    fc.assert(fc.property(orderIdArb, verifyOrderNotFoundThrows), { numRuns: 100 });
  });

  it("should not create partial invoice records on failure", () => {
    fc.assert(
      fc.property(
        orderIdArb,
        amountArb,
        pdfDataArb,
        errorMessageArb,
        verifyNoPartialRecordsOnFailure
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
        verifyErrorMessagePropagated
      ),
      { numRuns: 100 }
    );
  });

  it("should not swallow errors silently (unlike audit logging)", () => {
    fc.assert(
      fc.property(orderIdArb, amountArb, pdfDataArb, errorMessageArb, verifyErrorNotSwallowed),
      { numRuns: 100 }
    );
  });

  it("should succeed when no failures occur", () => {
    fc.assert(fc.property(orderIdArb, amountArb, pdfDataArb, verifySuccessWithNoFailures), {
      numRuns: 100,
    });
  });
});
