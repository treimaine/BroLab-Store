# Requirements Document

## Introduction

This feature completes the Convex database integration for four server-side files that currently have placeholder implementations. These files contain "Convex Integration pending" comments and use temporary solutions (console.log, empty arrays, placeholder URLs) instead of persisting data to Convex. The integration will connect the Express server layer to existing Convex functions for audit logging, file storage metadata, and invoice management.

## Glossary

- **AuditLogger**: Singleton service in Express that logs security-relevant actions (logins, payments, profile updates)
- **Convex**: Real-time database used as the primary data store for the application
- **ConvexHttpClient**: Server-side HTTP client for calling Convex functions from Express routes
- **File Metadata**: Database record containing file information (filename, path, size, MIME type) without the actual file content
- **Signed URL**: Time-limited URL for secure file access
- **Invoice Number**: Unique identifier for invoices in format `BRLB-{YEAR}-{SEQUENCE}`
- **Atomic Counter**: Database counter that increments safely under concurrent access

## Requirements

### Requirement 1: Audit Logger Convex Integration

**User Story:** As a system administrator, I want audit logs persisted to Convex, so that I can track security events and user actions reliably.

#### Acceptance Criteria

1. WHEN the AuditLogger logs an entry THEN the System SHALL persist the entry to the Convex auditLogs table using the logAuditEvent mutation
2. WHEN getUserAuditLogs is called with a userId THEN the System SHALL query Convex and return the user's audit logs ordered by timestamp descending
3. WHEN getSecurityEvents is called THEN the System SHALL query Convex and return security-related events (login_failed, security_event, rate_limit_exceeded)
4. IF the Convex mutation fails THEN the System SHALL log the error to console and continue without throwing

### Requirement 2: Storage Routes Convex Integration

**User Story:** As a user, I want my uploaded files tracked in the database, so that I can list, access, and delete my files reliably.

#### Acceptance Criteria

1. WHEN a file is uploaded successfully THEN the System SHALL create a file record in Convex using the createFile mutation and return the file ID
2. WHEN a user requests a signed URL for a file THEN the System SHALL query Convex for the file record and verify ownership before generating the URL
3. WHEN a user lists their files THEN the System SHALL query Convex using listFiles and return the user's files with optional role filtering
4. WHEN a user deletes a file THEN the System SHALL verify ownership via Convex query and delete both the storage file and the Convex record
5. IF the user does not own the file THEN the System SHALL return a 403 Access Denied error

### Requirement 3: Storage Library Convex Integration

**User Story:** As a developer, I want the storage utility functions to use Convex Storage, so that files are actually stored and retrievable.

#### Acceptance Criteria

1. WHEN uploadUserFile is called THEN the System SHALL upload the file buffer to Convex Storage and return the storage path and URL
2. WHEN getSignedUrl is called THEN the System SHALL generate a time-limited URL from Convex Storage for the specified file path
3. WHEN deleteFile is called THEN the System SHALL remove the file from Convex Storage
4. IF the storage operation fails THEN the System SHALL throw an error with a descriptive message

### Requirement 4: Invoice Number Generation with Convex

**User Story:** As a business owner, I want invoice numbers generated atomically and persisted, so that each invoice has a unique sequential number.

#### Acceptance Criteria

1. WHEN ensureInvoiceNumber is called for an order THEN the System SHALL use a Convex atomic counter to generate a unique invoice number
2. WHEN the invoice number is generated THEN the System SHALL follow the format BRLB-{YEAR}-{6-DIGIT-SEQUENCE}
3. WHEN ensureInvoicePdf is called THEN the System SHALL store the PDF in Convex Storage and save the URL to the invoicesOrders table
4. IF the order already has an invoice number THEN the System SHALL return the existing number without generating a new one

### Requirement 5: Error Handling and Graceful Degradation

**User Story:** As a system operator, I want the integration to handle errors gracefully, so that temporary Convex issues don't crash the application.

#### Acceptance Criteria

1. WHEN a Convex operation fails in audit logging THEN the System SHALL log the error and continue without throwing
2. WHEN a Convex operation fails in file operations THEN the System SHALL return an appropriate HTTP error response
3. WHEN a Convex operation fails in invoice generation THEN the System SHALL throw an error to prevent incomplete invoices
4. IF the Convex client is not initialized THEN the System SHALL throw a configuration error with setup instructions
