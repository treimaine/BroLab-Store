// File validation utilities for custom beat requests

export interface ValidationError {
  message: string;
  code: string;
  recoverable: boolean;
  severity: "warning" | "error";
}

const AUDIO_EXTENSIONS = [".mp3", ".wav", ".aiff", ".flac", ".m4a"];
const ARCHIVE_EXTENSIONS = [".zip", ".rar", ".7z"];
const MAX_AUDIO_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export const validateBeatRequestFile = (file: File): ValidationError | null => {
  const fileName = file.name.toLowerCase();

  const isAudio = AUDIO_EXTENSIONS.some(ext => fileName.endsWith(ext));
  const isArchive = ARCHIVE_EXTENSIONS.some(ext => fileName.endsWith(ext));

  if (!isAudio && !isArchive) {
    return {
      message: "Please upload audio files or compressed archives containing audio files",
      code: "INVALID_CONTENT_TYPE",
      recoverable: false,
      severity: "error",
    };
  }

  if (isAudio && file.size > MAX_AUDIO_FILE_SIZE) {
    return {
      message:
        "Individual audio files should be under 50MB. Use compressed archives for larger files.",
      code: "AUDIO_FILE_TOO_LARGE",
      recoverable: false,
      severity: "warning",
    };
  }

  return null;
};
