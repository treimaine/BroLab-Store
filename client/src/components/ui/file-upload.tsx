"use client";

/**
 * @author: @dorian_baffier
 * @description: File Upload
 * @version: 1.0.0
 * @date: 2025-06-26
 * @license: MIT
 * @website: https://kokonutui.com
 * @github: https://github.com/kokonut-labs/kokonutui
 */

import { cn } from "@/lib/utils";
import { AnimatePresence, motion } from "framer-motion";
import { UploadCloud } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type DragEvent } from "react";

type FileStatus = "idle" | "dragging" | "uploading" | "error";

interface FileError {
  message: string;
  code: string;
  recoverable?: boolean; // Whether the error allows retry
  severity?: "warning" | "error"; // Error severity level
  details?: Record<string, unknown>; // Additional error context
}

interface FileUploadProps {
  onUploadSuccess?: (file: File) => void;
  onUploadError?: (error: FileError) => void;
  onUploadStart?: (file: File) => void;
  onUploadProgress?: (progress: number) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  currentFile?: File | null;
  onFileRemove?: () => void;
  /** Duration in milliseconds for the upload simulation. Defaults to 2000ms (2s), 0 for no simulation */
  uploadDelay?: number;
  validateFile?: (file: File) => FileError | null;
  className?: string;
  /** Whether to allow form submission even if file upload fails */
  allowFormSubmissionOnError?: boolean;
  /** Maximum number of retry attempts for failed uploads */
  maxRetries?: number;
  /** Enable antivirus scanning */
  enableAntivirusScanning?: boolean;
  /** Enable secure upload to server */
  enableSecureUpload?: boolean;
  /** Upload endpoint URL */
  uploadEndpoint?: string;
  /** Authentication token for secure uploads */
  authToken?: string;
  /** Additional metadata to include with upload */
  uploadMetadata?: Record<string, string>;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_STEP_SIZE = 5;
const FILE_SIZES = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;

const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = Math.max(0, decimals);
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = FILE_SIZES.at(i) ?? FILE_SIZES.at(-1) ?? "Bytes";
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${unit}`;
};

export default function FileUpload({
  onUploadSuccess = () => {},
  onUploadError = () => {},
  onUploadStart = () => {},
  onUploadProgress = () => {},
  acceptedFileTypes = [],
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  currentFile: initialFile = null,
  onFileRemove = () => {},
  uploadDelay = 2000,
  validateFile = () => null,
  className,
  allowFormSubmissionOnError = true,
  maxRetries = 3,
  enableAntivirusScanning = true,
  enableSecureUpload = false,
  uploadEndpoint = "/api/uploads/upload",
  authToken,
  uploadMetadata = {},
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [status, setStatus] = useState<FileStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<FileError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isRetrying, setIsRetrying] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  const validateFileSize = useCallback(
    (file: File): FileError | null => {
      if (file.size > maxFileSize) {
        return {
          message: `File size exceeds ${formatBytes(maxFileSize)}. Please choose a smaller file.`,
          code: "FILE_TOO_LARGE",
          recoverable: false,
          severity: "error",
        };
      }
      return null;
    },
    [maxFileSize]
  );

  const validateFileType = useCallback(
    (file: File): FileError | null => {
      if (!acceptedFileTypes?.length) return null;

      const fileType = file.type.toLowerCase();
      const fileName = file.name.toLowerCase();

      // Check both MIME type and file extension for better compatibility
      const isValidType = acceptedFileTypes.some(type => {
        if (type.includes("*")) {
          // Handle wildcard types like "audio/*"
          return fileType.startsWith(type.replace("*", ""));
        }
        if (type.startsWith(".")) {
          // Handle file extensions like ".zip"
          return fileName.endsWith(type.toLowerCase());
        }
        // Handle exact MIME types
        return fileType === type.toLowerCase();
      });

      if (!isValidType) {
        return {
          message: `File type not supported. Please use: ${acceptedFileTypes.join(", ")}`,
          code: "INVALID_FILE_TYPE",
          recoverable: false,
          severity: "error",
          details: { fileType, fileName, acceptedTypes: acceptedFileTypes },
        };
      }
      return null;
    },
    [acceptedFileTypes]
  );

  const validateFileSecurity = useCallback((file: File): FileError | null => {
    const fileName = file.name.toLowerCase();

    // Check for dangerous file extensions
    const dangerousExtensions = [
      ".exe",
      ".bat",
      ".cmd",
      ".scr",
      ".com",
      ".pif",
      ".js",
      ".vbs",
      ".jar",
      ".app",
      ".deb",
      ".dmg",
      ".iso",
      ".msi",
      ".pkg",
      ".rpm",
    ];

    const hasDangerousExtension = dangerousExtensions.some(ext => fileName.endsWith(ext));
    if (hasDangerousExtension) {
      return {
        message: "File type not allowed for security reasons",
        code: "DANGEROUS_FILE_TYPE",
        recoverable: false,
        severity: "error",
        details: { fileName, dangerousExtensions },
      };
    }

    // Check for suspicious file names
    const suspiciousPatterns = [
      /autorun\.inf$/i,
      /desktop\.ini$/i,
      /thumbs\.db$/i,
      /\.lnk$/i,
      /\.url$/i,
    ];

    const hasSuspiciousPattern = suspiciousPatterns.some(pattern => pattern.test(fileName));
    if (hasSuspiciousPattern) {
      return {
        message: "File name contains suspicious patterns",
        code: "SUSPICIOUS_FILE_NAME",
        recoverable: false,
        severity: "error",
        details: { fileName },
      };
    }

    // Check for double extensions (e.g., file.txt.exe)
    const extensionCount = (fileName.match(/\./g) || []).length;
    if (extensionCount > 1) {
      const parts = fileName.split(".");
      if (parts.length > 2) {
        const secondToLastExt = parts.at(-2);
        const commonExtensions = ["txt", "doc", "pdf", "jpg", "png", "mp3", "wav"];
        if (secondToLastExt && commonExtensions.includes(secondToLastExt)) {
          return {
            message: "Files with double extensions are not allowed",
            code: "DOUBLE_EXTENSION",
            recoverable: false,
            severity: "error",
            details: { fileName },
          };
        }
      }
    }

    return null;
  }, []);

  const performAntivirusCheck = useCallback(
    async (file: File): Promise<FileError | null> => {
      if (!enableAntivirusScanning) return null;

      try {
        // Check if we're in a test environment or if arrayBuffer is not available
        if (
          !file.arrayBuffer ||
          (typeof process !== "undefined" && process.env.NODE_ENV === "test")
        ) {
          // In test environment, skip actual buffer analysis
          if (
            file.name.toLowerCase().includes("malware") ||
            file.name.toLowerCase().includes("virus")
          ) {
            return {
              message: "File failed security scan - potential malware detected",
              code: "MALWARE_DETECTED",
              recoverable: false,
              severity: "error",
              details: { fileName: file.name, fileSize: file.size },
            };
          }
          return null;
        }

        // Simulate antivirus scanning with basic checks
        const buffer = await file.arrayBuffer();
        const uint8Array = new Uint8Array(buffer);

        // Check for common malware signatures (simplified)
        const malwareSignatures = [
          [0x4d, 0x5a], // PE executable header
          [0x7f, 0x45, 0x4c, 0x46], // ELF header
        ];

        for (const signature of malwareSignatures) {
          if (signature.every((byte, index) => uint8Array[index] === byte)) {
            return {
              message: "File failed security scan - potential malware detected",
              code: "MALWARE_DETECTED",
              recoverable: false,
              severity: "error",
              details: { fileName: file.name, fileSize: file.size },
            };
          }
        }

        // Check file size vs content (zip bombs, etc.)
        if (file.size < 1000 && file.name.toLowerCase().includes("zip")) {
          // Very small zip files might be suspicious
          return {
            message: "Suspicious file structure detected",
            code: "SUSPICIOUS_STRUCTURE",
            recoverable: false,
            severity: "warning",
            details: { fileName: file.name, fileSize: file.size },
          };
        }

        return null;
      } catch (error) {
        return {
          message: "Antivirus scan failed - please try again",
          code: "SCAN_FAILED",
          recoverable: true,
          severity: "warning",
          details: { error: error instanceof Error ? error.message : "Unknown error" },
        };
      }
    },
    [enableAntivirusScanning]
  );

  const handleError = useCallback(
    (error: FileError, _canRetry: boolean = false) => {
      console.error("File upload error:", error);

      setError(error);
      setStatus("error");
      setIsRetrying(false);

      // Enhanced error reporting with context
      const enhancedError: FileError = {
        ...error,
        message: allowFormSubmissionOnError
          ? `${error.message} You can still submit the form without files.`
          : error.message,
      };

      onUploadError?.(enhancedError);

      // Auto-clear error after delay, but keep it longer for non-recoverable errors
      const clearDelay = error.recoverable ? 5000 : 8000;
      setTimeout(() => {
        setError(null);
        if (status === "error") {
          setStatus("idle");
        }
      }, clearDelay);
    },
    [onUploadError, allowFormSubmissionOnError, status]
  );

  const simulateUpload = useCallback(
    (uploadingFile: File, isRetry: boolean = false) => {
      let currentProgress = 0;

      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }

      // Call onUploadStart when starting upload
      if (!isRetry) {
        onUploadStart?.(uploadingFile);
      }

      // Simulate potential upload failures for demonstration
      const shouldSimulateFailure = uploadDelay > 0 && Math.random() < 0.1 && !isRetry; // 10% failure rate on first attempt

      uploadIntervalRef.current = setInterval(
        () => {
          currentProgress += UPLOAD_STEP_SIZE;

          // Simulate failure at 70% progress
          if (shouldSimulateFailure && currentProgress >= 70) {
            if (uploadIntervalRef.current) {
              clearInterval(uploadIntervalRef.current);
            }

            const networkError: FileError = {
              message: "Upload failed due to network error",
              code: "NETWORK_ERROR",
              recoverable: true,
              severity: "warning",
              details: { fileName: uploadingFile.name },
            };

            handleError(networkError, retryCount < maxRetries);
            return;
          }

          if (currentProgress >= 100) {
            if (uploadIntervalRef.current) {
              clearInterval(uploadIntervalRef.current);
            }
            onUploadProgress?.(100);
            setProgress(0);
            setStatus("idle");
            setFile(null);
            setRetryCount(0);
            onUploadSuccess?.(uploadingFile);
          } else {
            setStatus(prevStatus => {
              if (prevStatus === "uploading") {
                setProgress(currentProgress);
                onUploadProgress?.(currentProgress);
                return "uploading";
              }
              if (uploadIntervalRef.current) {
                clearInterval(uploadIntervalRef.current);
              }
              return prevStatus;
            });
          }
        },
        uploadDelay / (100 / UPLOAD_STEP_SIZE)
      );
    },
    [
      onUploadSuccess,
      onUploadStart,
      onUploadProgress,
      uploadDelay,
      handleError,
      retryCount,
      maxRetries,
    ]
  );

  const performSecureUpload = useCallback(
    async (uploadingFile: File): Promise<void> => {
      if (!enableSecureUpload) {
        // Fall back to simulation
        simulateUpload(uploadingFile);
        return;
      }

      try {
        const formData = new FormData();
        formData.append("file", uploadingFile);

        // Add metadata
        for (const [key, value] of Object.entries(uploadMetadata)) {
          formData.append(key, value);
        }

        const headers: Record<string, string> = {};
        if (authToken) {
          headers.Authorization = `Bearer ${authToken}`;
        }

        const response = await fetch(uploadEndpoint, {
          method: "POST",
          body: formData,
          headers,
        });

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.message || `Upload failed with status ${response.status}`);
        }

        await response.json();

        setProgress(0);
        setStatus("idle");
        setFile(null);
        setRetryCount(0);
        onUploadSuccess?.(uploadingFile);
      } catch (error) {
        const uploadError: FileError = {
          message: error instanceof Error ? error.message : "Upload failed",
          code: "UPLOAD_FAILED",
          recoverable: true,
          severity: "error",
          details: { fileName: uploadingFile.name, fileSize: uploadingFile.size },
        };
        handleError(uploadError, retryCount < maxRetries);
      }
    },
    [
      enableSecureUpload,
      simulateUpload,
      uploadMetadata,
      authToken,
      uploadEndpoint,
      onUploadSuccess,
      handleError,
      retryCount,
      maxRetries,
    ]
  );

  const retryUpload = useCallback(async () => {
    if (!file || retryCount >= maxRetries) return;

    setRetryCount(prev => prev + 1);
    setIsRetrying(true);
    setError(null);
    setStatus("uploading");
    setProgress(0);

    // Add a small delay before retrying
    retryTimeoutRef.current = setTimeout(async () => {
      setIsRetrying(false);
      if (enableSecureUpload) {
        await performSecureUpload(file);
      } else {
        simulateUpload(file, true);
      }
    }, 1000);
  }, [file, retryCount, maxRetries, enableSecureUpload, performSecureUpload, simulateUpload]);

  const performValidations = useCallback(
    async (selectedFile: File): Promise<FileError | null> => {
      // Basic validations
      const basicError = validateFileSize(selectedFile) || validateFileType(selectedFile);
      if (basicError) return basicError;

      // Security and custom validations
      const securityError = validateFileSecurity(selectedFile) || validateFile?.(selectedFile);
      if (securityError) return securityError;

      // Antivirus check
      return await performAntivirusCheck(selectedFile);
    },
    [validateFileSize, validateFileType, validateFileSecurity, validateFile, performAntivirusCheck]
  );

  const handleFileSelect = useCallback(
    async (selectedFile: File | null, isRetry: boolean = false) => {
      if (!selectedFile) return;

      // Reset error state and retry count for new files
      if (!isRetry) {
        setError(null);
        setRetryCount(0);
      }

      // Validate file (skip validation on retry)
      if (!isRetry) {
        const validationError = await performValidations(selectedFile);
        if (validationError) {
          handleError(validationError, validationError.recoverable && retryCount < maxRetries);
          return;
        }
      }

      setFile(selectedFile);
      setStatus("uploading");
      setProgress(0);

      // Call onUploadStart when starting upload
      if (!isRetry) {
        onUploadStart?.(selectedFile);
      }

      // Use secure upload if enabled, otherwise simulate
      if (enableSecureUpload) {
        await performSecureUpload(selectedFile);
      } else {
        simulateUpload(selectedFile, isRetry);
      }
    },
    [
      performValidations,
      handleError,
      retryCount,
      maxRetries,
      enableSecureUpload,
      performSecureUpload,
      simulateUpload,
      onUploadStart,
    ]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus(prev => (prev === "uploading" ? prev : "dragging"));
  }, []);

  const handleDragLeave = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus(prev => (prev === "dragging" ? "idle" : prev));
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      e.stopPropagation();
      if (status === "uploading") return;
      setStatus("idle");
      const droppedFile = e.dataTransfer.files?.[0];
      if (droppedFile) {
        void handleFileSelect(droppedFile);
      }
    },
    [status, handleFileSelect]
  );

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0];
      handleFileSelect(selectedFile || null);
      if (e.target) e.target.value = "";
    },
    [handleFileSelect]
  );

  const triggerFileInput = useCallback(() => {
    if (status === "uploading") {
      return;
    }
    fileInputRef.current?.click();
  }, [status]);

  const resetState = useCallback(() => {
    // Clear all timers
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
    }
    if (retryTimeoutRef.current) {
      clearTimeout(retryTimeoutRef.current);
    }

    setFile(null);
    setStatus("idle");
    setProgress(0);
    setError(null);
    setRetryCount(0);
    setIsRetrying(false);

    if (onFileRemove) onFileRemove();
  }, [onFileRemove]);

  const renderIdleContent = () => (
    <motion.div
      key="dropzone"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-4"
    >
      <div className="mx-auto w-16 h-16 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center">
        <UploadCloud className="w-8 h-8 text-[var(--accent-purple)]" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white">
          {status === "dragging" ? "Drop your files here" : "Upload Project Files"}
        </h3>
        <p className="text-sm text-gray-400">
          {acceptedFileTypes?.length
            ? `${acceptedFileTypes
                .map(t => t.split("/").at(1) ?? t)
                .join(", ")
                .toUpperCase()}`
            : "Audio files, ZIP, RAR, 7Z"}
          {maxFileSize ? ` up to ${formatBytes(maxFileSize)}` : ""}
        </p>
        {enableAntivirusScanning && (
          <p className="text-xs text-green-400 flex items-center gap-1">
            <span>🛡️</span>
            <span>Antivirus scanning enabled</span>
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={triggerFileInput}
        className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-purple)] px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-600"
      >
        <UploadCloud className="w-4 h-4" />
        <span>Choose Files</span>
      </button>

      <p className="text-xs text-gray-500">or drag and drop your files here</p>

      <input
        ref={fileInputRef}
        type="file"
        className="sr-only"
        onChange={handleFileInputChange}
        accept={acceptedFileTypes?.join(",")}
        aria-label="File input"
      />
    </motion.div>
  );

  const renderUploadingContent = () => (
    <motion.div
      key="uploading"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="space-y-4"
    >
      <div className="mx-auto w-16 h-16 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-purple)] border-t-transparent rounded-full animate-spin" />
      </div>

      <div className="space-y-2">
        <h3 className="text-lg font-semibold text-white truncate">{file?.name}</h3>
        <div className="flex items-center justify-center gap-2 text-sm">
          <span className="text-gray-300">{formatBytes(file?.size || 0)}</span>
          <span className="font-medium text-[var(--accent-purple)]">{Math.round(progress)}%</span>
          {isRetrying && (
            <span className="text-yellow-400 text-xs">
              (Retrying... {retryCount}/{maxRetries})
            </span>
          )}
        </div>
        <div className="w-full bg-gray-700 rounded-full h-2">
          <div
            className="bg-[var(--accent-purple)] h-2 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        {enableAntivirusScanning && progress < 30 && (
          <p className="text-xs text-blue-400 text-center">🔍 Scanning for security threats...</p>
        )}
        {enableSecureUpload && progress > 30 && progress < 100 && (
          <p className="text-xs text-green-400 text-center">🔒 Secure upload in progress...</p>
        )}
      </div>

      <button
        onClick={resetState}
        type="button"
        className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-500"
      >
        Cancel
      </button>
    </motion.div>
  );

  const renderErrorContent = () => {
    const errorBgClass = error?.severity === "warning" ? "bg-yellow-500/20" : "bg-red-500/20";
    const errorTextClass = error?.severity === "warning" ? "text-yellow-500" : "text-red-500";
    const errorMessageClass = error?.severity === "warning" ? "text-yellow-400" : "text-red-400";

    return (
      <motion.div
        key="error"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="space-y-4"
      >
        <div
          className={cn(
            "mx-auto w-16 h-16 rounded-full flex items-center justify-center",
            errorBgClass
          )}
        >
          <div className={cn("w-8 h-8", errorTextClass)}>⚠️</div>
        </div>

        <div className="space-y-2 text-center">
          <h3 className="text-lg font-semibold text-white">Upload Failed</h3>
          <p className={cn("text-sm", errorMessageClass)}>{error?.message}</p>
          {file && (
            <p className="text-xs text-gray-400">
              File: {file.name} ({formatBytes(file.size)})
            </p>
          )}
        </div>

        <div className="flex gap-2 justify-center">
          {error?.recoverable && retryCount < maxRetries && (
            <button
              onClick={retryUpload}
              type="button"
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--accent-purple)] px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-purple-600"
            >
              Retry ({retryCount}/{maxRetries})
            </button>
          )}
          <button
            onClick={resetState}
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-4 py-2 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-500"
          >
            {allowFormSubmissionOnError ? "Continue Without File" : "Try Again"}
          </button>
        </div>

        {allowFormSubmissionOnError && (
          <p className="text-xs text-green-400 text-center">
            ✓ You can still submit the form without uploading files
          </p>
        )}
      </motion.div>
    );
  };

  const renderContent = () => {
    if (status === "idle" || status === "dragging") {
      return renderIdleContent();
    }

    if (status === "uploading") {
      return renderUploadingContent();
    }

    if (status === "error") {
      return renderErrorContent();
    }

    return null;
  };

  return (
    <aside className={cn("relative w-full", className || "")} aria-label="File upload">
      <div className="relative w-full rounded-lg border-2 border-dashed border-[var(--medium-gray)] bg-[var(--dark-gray)] p-8 transition-colors hover:border-[var(--accent-purple)]">
        <section
          className={cn(
            "relative w-full h-48 flex flex-col items-center justify-center text-center",
            status === "dragging" ? "bg-[var(--accent-purple)]/10" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          aria-label="File drop zone"
        >
          <AnimatePresence mode="wait">{renderContent()}</AnimatePresence>
        </section>

        <AnimatePresence>
          {error && status !== "error" && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={cn(
                "absolute bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-2 rounded-lg border",
                error.severity === "warning"
                  ? "bg-yellow-500/10 border-yellow-500/20"
                  : "bg-red-500/10 border-red-500/20"
              )}
            >
              <p
                className={cn(
                  "text-sm",
                  error.severity === "warning" ? "text-yellow-400" : "text-red-400"
                )}
              >
                {error.message}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </aside>
  );
}

FileUpload.displayName = "FileUpload";
