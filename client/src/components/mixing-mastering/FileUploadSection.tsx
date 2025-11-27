import FileUpload from "@/components/ui/file-upload";
import { Label } from "@/components/ui/label";
import { AlertTriangle, CheckCircle } from "lucide-react";

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
  return (
    <div className="space-y-3">
      <Label className="text-white">Upload Project Files (Optional)</Label>
      <div className="flex justify-center">
        <FileUpload
          onUploadSuccess={onFileUploadSuccess}
          onUploadError={onFileUploadError}
          acceptedFileTypes={["audio/*", ".zip", ".rar", ".7z"]}
          maxFileSize={100 * 1024 * 1024}
          uploadDelay={2000}
          allowFormSubmissionOnError={true}
          maxRetries={3}
          className="w-full"
        />
      </div>

      {uploadedFiles.length > 0 && (
        <div className="space-y-2">
          <p className="text-sm text-gray-300 font-medium">✓ Uploaded files:</p>
          {uploadedFiles.map((file, index) => (
            <div
              key={`${file.name}-${file.size}-${index}`}
              className="flex items-center justify-between bg-green-900/20 border border-green-500/30 p-3 rounded"
            >
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-500" />
                <span className="text-white text-sm">{file.name}</span>
              </div>
              <button
                type="button"
                onClick={() => onFileRemove(index)}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}

      {fileUploadErrors.length > 0 && (
        <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded">
          <div className="flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-yellow-300 text-sm font-medium">File Upload Issues Detected</p>
              <p className="text-yellow-200 text-xs mt-1">
                Don&apos;t worry - you can still submit your reservation! Files can be sent later
                via email or cloud storage.
              </p>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-gray-500 text-xs">
          <strong>File Upload Tips:</strong> Files will be securely stored and processed after
          booking confirmation.
        </p>
        <p className="text-gray-500 text-xs">
          <strong>Alternative Options:</strong> You can also send files via email or share cloud
          storage links (Google Drive, Dropbox, etc.) after booking.
        </p>
        <p className="text-green-400 text-xs">
          ✓ <strong>Form Submission:</strong> Your reservation will work perfectly even without file
          uploads.
        </p>
      </div>
    </div>
  );
}
