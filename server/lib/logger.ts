export interface LogFields {
  requestId?: string;
  userId?: string;
  orderId?: string;
  eventId?: string;
  [key: string]: any;
}

function time() {
  return new Date().toISOString();
}

export const logger = {
  info(message: string, fields: LogFields = {}) {
    // Minimal structured logging to STDOUT
    console.log(JSON.stringify({ level: "info", time: time(), message, ...fields }));
  },
  warn(message: string, fields: LogFields = {}) {
    console.warn(JSON.stringify({ level: "warn", time: time(), message, ...fields }));
  },
  error(message: string, fields: LogFields = {}) {
    console.error(JSON.stringify({ level: "error", time: time(), message, ...fields }));
  },
};



