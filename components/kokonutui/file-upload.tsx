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
}

interface FileUploadProps {
  onUploadSuccess?: (file: File) => void;
  onUploadError?: (error: FileError) => void;
  acceptedFileTypes?: string[];
  maxFileSize?: number;
  currentFile?: File | null;
  onFileRemove?: () => void;
  /** Duration in milliseconds for the upload simulation. Defaults to 2000ms (2s), 0 for no simulation */
  uploadDelay?: number;
  validateFile?: (file: File) => FileError | null;
  className?: string;
}

const DEFAULT_MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_STEP_SIZE = 5;
const FILE_SIZES = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"] as const;

const formatBytes = (bytes: number, decimals = 2): string => {
  if (!+bytes) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  const unit = FILE_SIZES[i] || FILE_SIZES[FILE_SIZES.length - 1];
  return `${Number.parseFloat((bytes / k ** i).toFixed(dm))} ${unit}`;
};

export default function FileUpload({
  onUploadSuccess = () => {},
  onUploadError = () => {},
  acceptedFileTypes = [],
  maxFileSize = DEFAULT_MAX_FILE_SIZE,
  currentFile: initialFile = null,
  onFileRemove = () => {},
  uploadDelay = 2000,
  validateFile = () => null,
  className,
}: FileUploadProps) {
  const [file, setFile] = useState<File | null>(initialFile);
  const [status, setStatus] = useState<FileStatus>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState<FileError | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
    };
  }, []);

  const validateFileSize = useCallback(
    (file: File): FileError | null => {
      if (file.size > maxFileSize) {
        return {
          message: `File size exceeds ${formatBytes(maxFileSize)}`,
          code: "FILE_TOO_LARGE",
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
      if (!acceptedFileTypes.some(type => fileType.match(type.toLowerCase()))) {
        return {
          message: `File type must be ${acceptedFileTypes.join(", ")}`,
          code: "INVALID_FILE_TYPE",
        };
      }
      return null;
    },
    [acceptedFileTypes]
  );

  const handleError = useCallback(
    (error: FileError) => {
      setError(error);
      setStatus("error");
      onUploadError?.(error);

      setTimeout(() => {
        setError(null);
        setStatus("idle");
      }, 3000);
    },
    [onUploadError]
  );

  const simulateUpload = useCallback(
    (uploadingFile: File) => {
      let currentProgress = 0;

      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }

      uploadIntervalRef.current = setInterval(
        () => {
          currentProgress += UPLOAD_STEP_SIZE;
          if (currentProgress >= 100) {
            if (uploadIntervalRef.current) {
              clearInterval(uploadIntervalRef.current);
            }
            setProgress(0);
            setStatus("idle");
            setFile(null);
            onUploadSuccess?.(uploadingFile);
          } else {
            setStatus(prevStatus => {
              if (prevStatus === "uploading") {
                setProgress(currentProgress);
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
    [onUploadSuccess, uploadDelay]
  );

  const handleFileSelect = useCallback(
    (selectedFile: File | null) => {
      if (!selectedFile) return;

      // Reset error state
      setError(null);

      // Validate file
      const sizeError = validateFileSize(selectedFile);
      if (sizeError) {
        handleError(sizeError);
        return;
      }

      const typeError = validateFileType(selectedFile);
      if (typeError) {
        handleError(typeError);
        return;
      }

      const customError = validateFile?.(selectedFile);
      if (customError) {
        handleError(customError);
        return;
      }

      setFile(selectedFile);
      setStatus("uploading");
      setProgress(0);
      simulateUpload(selectedFile);
    },
    [simulateUpload, validateFileSize, validateFileType, validateFile, handleError]
  );

  const handleDragOver = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setStatus(prev => (prev !== "uploading" ? "dragging" : prev));
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
      if (droppedFile) handleFileSelect(droppedFile);
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
    if (status === "uploading") return;
    fileInputRef.current?.click();
  }, [status]);

  const resetState = useCallback(() => {
    setFile(null);
    setStatus("idle");
    setProgress(0);
    if (onFileRemove) onFileRemove();
  }, [onFileRemove]);

  return (
    <div
      className={cn("relative w-full", className || "")}
      role="complementary"
      aria-label="File upload"
    >
      <div className="relative w-full rounded-lg border-2 border-dashed border-[var(--medium-gray)] bg-[var(--dark-gray)] p-8 transition-colors hover:border-[var(--accent-purple)]">
        <div
          className={cn(
            "relative w-full h-48 flex flex-col items-center justify-center text-center",
            status === "dragging" ? "bg-[var(--accent-purple)]/10" : ""
          )}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
        >
          <AnimatePresence mode="wait">
            {status === "idle" || status === "dragging" ? (
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
                          .map(t => t.split("/")[1])
                          .join(", ")
                          .toUpperCase()}`
                      : "Audio files, ZIP, RAR, 7Z"}{" "}
                    {maxFileSize && `up to ${formatBytes(maxFileSize)}`}
                  </p>
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
            ) : status === "uploading" ? (
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
                    <span className="font-medium text-[var(--accent-purple)]">
                      {Math.round(progress)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-700 rounded-full h-2">
                    <div
                      className="bg-[var(--accent-purple)] h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>

                <button
                  onClick={resetState}
                  type="button"
                  className="inline-flex items-center gap-2 rounded-lg bg-gray-600 px-6 py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-gray-500"
                >
                  Cancel
                </button>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>

        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="absolute bottom-2 left-1/2 transform -translate-x-1/2 px-4 py-2 bg-red-500/10 border border-red-500/20 rounded-lg"
            >
              <p className="text-sm text-red-400">{error.message}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

FileUpload.displayName = "FileUpload";
