/**
 * Development-only logging utility
 * Prevents console logs from appearing in production builds
 */

const isDevelopment = import.meta.env.DEV;

export const devLogger = {
  log: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  warn: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  error: (...args: unknown[]): void => {
    // Always log errors, even in production
    console.error(...args);
  },

  info: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  debug: (...args: unknown[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  group: (label: string): void => {
    if (isDevelopment) {
      console.group(label);
    }
  },

  groupEnd: (): void => {
    if (isDevelopment) {
      console.groupEnd();
    }
  },

  table: (data: unknown): void => {
    if (isDevelopment) {
      console.table(data);
    }
  },
};
