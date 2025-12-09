/**
 * Request ID Middleware
 *
 * Express middleware that assigns a unique, cryptographically secure request ID
 * to each incoming request. Supports validation of incoming x-request-id headers
 * and sets the X-Request-ID response header for traceability.
 *
 * @module server/middleware/requestId
 * @requirements 2.2, 2.3, 4.1, 4.3
 */

import { NextFunction, Request, Response } from "express";
import { generateSecureRequestId, isValidRequestId } from "../utils/requestId";

/**
 * Extended request interface with requestId property
 */
interface RequestWithId extends Request {
  requestId?: string;
}

/**
 * Express middleware that assigns a unique request ID to each request.
 *
 * Behavior:
 * - Uses provided x-request-id header if valid format
 * - Generates new secure UUID-based ID if header is missing or invalid
 * - Attaches request ID to req.requestId for downstream use
 * - Sets X-Request-ID response header before response is sent
 *
 * @param req - Express request object
 * @param res - Express response object
 * @param next - Express next function
 *
 * @requirements 2.2, 2.3, 4.1, 4.3
 */
export function requestIdMiddleware(req: RequestWithId, res: Response, next: NextFunction): void {
  // Check for existing x-request-id header
  const incomingRequestId = req.headers["x-request-id"];

  let requestId: string;

  // Validate incoming header if present
  if (typeof incomingRequestId === "string" && isValidRequestId(incomingRequestId)) {
    // Use valid incoming request ID
    requestId = incomingRequestId;
  } else {
    // Generate new secure request ID if missing or invalid
    requestId = generateSecureRequestId();

    // Log warning if invalid header was provided (not just missing)
    if (incomingRequestId !== undefined) {
      console.warn("Invalid x-request-id header received, generating new ID", {
        invalidId:
          typeof incomingRequestId === "string"
            ? incomingRequestId.slice(0, 50)
            : "non-string value",
        newId: requestId,
      });
    }
  }

  // Attach request ID to request object for downstream use
  req.requestId = requestId;

  // Set X-Request-ID response header before response is sent
  res.setHeader("X-Request-ID", requestId);

  next();
}

export default requestIdMiddleware;
