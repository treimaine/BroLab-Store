import FileUpload from "@/components/ui/file-upload";
import { AlertTriangle, CheckCircle, ChevronDown, HelpCircle } from "lucide-react";
import { useState } from "react";

interface FileUploadSectionProps {
  readonly uploadedFiles: File[];
  readonly fileUploadErrors: string[];
  readonly onFileUploadSuccess: (file: File) => void;
  readonly onFileUploadError: (error: {
    message: string;
    code: string;
    severity?: "warning" | "error";
    recoverable?: boolean;
  }) => void;
  readonly onFileRemove: (index: number) => void;
}

export function FileUploadSection({
  uploadedFiles,
  fileUploadErrors,
  onFileUploadSuccess,
  onFileUploadError,
  onFileRemove,
}: FileUploadSectionProps): JSX.Element {
  const [showTips, setShowTips] = useState(false);

  return (
    <div className="space-y-3">
      {/* Header with skip option */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-white font-medium">Upload Your Stems</p>
        <span className="text-xs text-gray-500">Optional</span>
      </div>

      {/* Upload component */}
      <div className="flex justify-center">
        <FileUpload
          onUploadSuccess={onFileUploadSuccess}
          onUploadError={onFileUploadError}
          acceptedFileTypes={["audio/*", ".wav", ".aiff", ".mp3", ".flac", ".zip", ".rar", ".7z"]}
          maxFileSize={100 * 1024 * 1024}
          uploadDelay={2000}
          allowFormSubmissionOnError={true}
          maxRetries={3}
          className="w-full"
        />
      </div>

      {/* Skip message */}
      <p className="text-xs text-gray-400 text-center">
        Or skip — you can send a{" "}
        <span className="text-[var(--accent-purple)]">Google Drive / Dropbox link</span> after
        booking
      </p>

      {/* Uploaded files list */}
      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-300 font-medium">Uploaded:</p>
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between bg-green-900/20 border border-green-500/30 p-2.5 rounded-lg"
            >
              <div className="flex items-center gap-2 min-w-0">
                <CheckCircle className="w-4 h-4 text-green-500 flex-shrink-0" />
                <span className="text-white text-sm truncate">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onFileRemove(index)}
                className="text-red-400 hover:text-red-300 text-xs ml-2 flex-shrink-0"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error warning */}
      {fileUploadErrors.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-300 text-sm font-medium">Upload issue</p>
              <p className="text-yellow-200 text-xs mt-1">
                No worries — you can still book and send files later.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapsible tips */}
      <button
        type="button"
        onClick={() => setShowTips(!showTips)}
        className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-400 transition-colors"
      >
        <HelpCircle className="w-3.5 h-3.5" />
        <span>Upload tips</span>
        <ChevronDown
          className={`w-3.5 h-3.5 transition-transform duration-200 ${showTips ? "rotate-180" : ""}`}
        />
      </button>

      {showTips && (
        <div className="bg-gray-800/50 rounded-lg p-3 space-y-2 text-xs text-gray-400">
          <p>
            <strong className="text-gray-300">Accepted formats:</strong> WAV, AIFF, MP3, FLAC, or
            ZIP/RAR archives
          </p>
          <p>
            <strong className="text-gray-300">Best practice:</strong> Export stems at the same
            sample rate as your session (44.1kHz or 48kHz)
          </p>
          <p>
            <strong className="text-gray-300">Alternative:</strong> Share a Google Drive or Dropbox
            link in the notes field
          </p>
        </div>
      )}
    </div>
  );
}
