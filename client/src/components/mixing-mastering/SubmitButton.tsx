import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2 } from "lucide-react";

interface SubmitButtonProps {
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  readonly isAuthLoading: boolean;
  readonly hasBeenSubmitted: boolean;
  readonly isFormValid: boolean;
  readonly price: number;
}

export function SubmitButton({
  isSubmitting,
  isValidating,
  isAuthLoading,
  hasBeenSubmitted,
  isFormValid,
  price,
}: SubmitButtonProps): JSX.Element {
  const getButtonContent = (): JSX.Element => {
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

    if (isAuthLoading) {
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
        <span>Reserve Session - ${price}</span>
      </div>
    );
  };

  return (
    <Button
      type="submit"
      disabled={isSubmitting || isAuthLoading || isValidating || (hasBeenSubmitted && !isFormValid)}
      className="btn-primary px-8 py-3 text-lg min-w-[280px] relative"
    >
      {getButtonContent()}
    </Button>
  );
}
