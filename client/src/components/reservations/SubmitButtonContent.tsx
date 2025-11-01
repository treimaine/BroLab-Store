import { AlertTriangle, Loader2, Send } from "lucide-react";

interface SubmitButtonContentProps {
  readonly submitting: boolean;
  readonly isValidating: boolean;
  readonly isUploading: boolean;
  readonly hasError: boolean;
  readonly currentStep: number;
  readonly totalSteps: number;
  readonly totalPrice: number;
}

export function SubmitButtonContent({
  submitting,
  isValidating,
  isUploading,
  hasError,
  currentStep,
  totalSteps,
  totalPrice,
}: SubmitButtonContentProps) {
  if (submitting) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        {currentStep > 0 && totalSteps > 0
          ? `Processing (${currentStep}/${totalSteps})...`
          : "Submitting Request..."}
      </div>
    );
  }

  if (isValidating) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Validating...
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="flex items-center gap-2">
        <Loader2 className="w-4 h-4 animate-spin" />
        Uploading Files...
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="flex items-center gap-2">
        <AlertTriangle className="w-4 h-4" />
        Please Fix Errors Above
      </div>
    );
  }

  return (
    <>
      <Send className="w-4 h-4 mr-2" />
      Submit Custom Beat Request - ${totalPrice}
    </>
  );
}
