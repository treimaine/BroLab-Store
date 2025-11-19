/**
 * Mixing & Mastering Render Helper Components
 * Extracted to reduce cognitive complexity
 */

import { AlertTriangle, ArrowRight, CheckCircle, Info, Loader2 } from "lucide-react";
import { calculateFormCompletion } from "./mixing-mastering-helpers";

interface RenderHelpersProps {
  isSubmitting: boolean;
  isValidating: boolean;
  authState: {
    isLoading: boolean;
    isAuthenticated: boolean;
  };
  selectedServiceData?: { price: number };
  hasBeenSubmitted: boolean;
  isFormValid: boolean;
  fileUploadErrors: string[];
  uploadedFiles: File[];
  formData: {
    name: string;
    email: string;
    preferredDate: string;
    timeSlot: string;
    projectDetails: string;
  };
}

export function createRenderHelpers(props: RenderHelpersProps) {
  const {
    isSubmitting,
    isValidating,
    authState,
    selectedServiceData,
    hasBeenSubmitted,
    isFormValid,
    fileUploadErrors,
    uploadedFiles,
    formData,
  } = props;

  const renderButtonContent = () => {
    if (isSubmitting) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing Reservation...</span>
        </div>
      );
    }

    if (isValidating) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Validating Form...</span>
        </div>
      );
    }

    if (authState.isLoading) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading Authentication...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <ArrowRight className="w-5 h-5" />
        <span>Reserve Session - ${selectedServiceData?.price}</span>
      </div>
    );
  };

  const renderAuthStatus = () => {
    if (authState.isLoading) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading your account information...</span>
        </div>
      );
    }

    if (!authState.isAuthenticated) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          <span>You&apos;ll be prompted to sign in before completing your reservation.</span>
        </div>
      );
    }

    if (!hasBeenSubmitted && !isSubmitting) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>Ready to book! We&apos;ll contact you within 24 hours to confirm.</span>
        </div>
      );
    }

    return null;
  };

  const renderFormValidationStatus = () => {
    if (hasBeenSubmitted && !isFormValid) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4" />
          <span>Please fix the errors above before submitting.</span>
        </div>
      );
    }

    if (isValidating) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Validating your information...</span>
        </div>
      );
    }

    return null;
  };

  const renderSubmissionStatus = () => {
    if (isSubmitting) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-purple-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Creating your reservation and preparing checkout...</span>
        </div>
      );
    }

    return null;
  };

  const renderFileUploadStatus = () => {
    if (fileUploadErrors.length > 0 && !isSubmitting) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
          <AlertTriangle className="w-4 h-4" />
          <span>File upload issues detected, but you can still submit your reservation.</span>
        </div>
      );
    }

    if (uploadedFiles.length > 0 && !isSubmitting) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-green-400">
          <CheckCircle className="w-4 h-4" />
          <span>
            {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} ready to include with
            your reservation.
          </span>
        </div>
      );
    }

    if (
      uploadedFiles.length === 0 &&
      fileUploadErrors.length === 0 &&
      !isSubmitting &&
      !authState.isLoading
    ) {
      return (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
          <Info className="w-4 h-4" />
          <span>Files are optional - you can send them later via email or cloud storage.</span>
        </div>
      );
    }

    return null;
  };

  const renderFormCompletionProgress = () => {
    if (authState.isLoading || isSubmitting) {
      return null;
    }

    const completion = calculateFormCompletion(formData);

    return (
      <div className="mt-4 p-3 bg-gray-900/30 rounded-lg">
        <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
          <span>Form Completion</span>
          <span>{completion}%</span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-1.5">
          <div
            className="bg-gradient-to-r from-[var(--accent-purple)] to-blue-500 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>
    );
  };

  return {
    renderButtonContent,
    renderAuthStatus,
    renderFormValidationStatus,
    renderSubmissionStatus,
    renderFileUploadStatus,
    renderFormCompletionProgress,
  };
}
