import { AlertTriangle, CheckCircle, Info, Loader2 } from "lucide-react";

interface FormStatusMessagesProps {
  readonly authState: {
    isLoading: boolean;
    isAuthenticated: boolean;
  };
  readonly hasBeenSubmitted: boolean;
  readonly isFormValid: boolean;
  readonly isValidating: boolean;
  readonly isSubmitting: boolean;
  readonly fileUploadErrors: string[];
  readonly uploadedFiles: File[];
}

export function FormStatusMessages({
  authState,
  hasBeenSubmitted,
  isFormValid,
  isValidating,
  isSubmitting,
  fileUploadErrors,
  uploadedFiles,
}: FormStatusMessagesProps): JSX.Element {
  return (
    <div className="mt-4 space-y-2">
      {authState.isLoading && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading your account information...</span>
        </div>
      )}

      {!authState.isLoading && !authState.isAuthenticated && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          <span>You&apos;ll be prompted to sign in before completing your reservation.</span>
        </div>
      )}

      {authState.isAuthenticated && !hasBeenSubmitted && !isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Ready to book! We&apos;ll contact you within 24 hours to confirm.</span>
        </div>
      )}

      {hasBeenSubmitted && !isFormValid && (
        <div className="flex items-center justify-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Please fix the errors above before submitting.</span>
        </div>
      )}

      {isValidating && (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Validating your information...</span>
        </div>
      )}

      {isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-purple-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creating your reservation and preparing checkout...</span>
        </div>
      )}

      {fileUploadErrors.length > 0 && !isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          <span>File upload issues detected, but you can still submit your reservation.</span>
        </div>
      )}

      {uploadedFiles.length > 0 && !isSubmitting && (
        <div className="flex items-center justify-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} ready to include with
            your reservation.
          </span>
        </div>
      )}

      {uploadedFiles.length === 0 &&
        fileUploadErrors.length === 0 &&
        !isSubmitting &&
        !authState.isLoading && (
          <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
            <Info className="w-4 h-4" />
            <span>Files are optional - you can send them later via email or cloud storage.</span>
          </div>
        )}
    </div>
  );
}
