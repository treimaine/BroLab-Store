/**
 * Common log fields for structured logging
 */
export interface LogFields {
  requestId?: string;
  userId?: string;
  orderId?: string;
  eventId?: string;
  error?: unknown;
  [key: string]: unknown;
}

function time(): string {
  return new Date().toISOString();
}

export const logger = {
  info<T extends object>(message: string, fields: T | LogFields = {} as T): void {
    // Minimal structured logging to STDOUT
    console.log(JSON.stringify({ level: "info", time: time(), message, ...fields }));
  },
  warn<T extends object>(message: string, fields: T | LogFields = {} as T): void {
    console.warn(JSON.stringify({ level: "warn", time: time(), message, ...fields }));
  },
  error<T extends object>(message: string, fields: T | LogFields = {} as T): void {
    console.error(JSON.stringify({ level: "error", time: time(), message, ...fields }));
  },
};
