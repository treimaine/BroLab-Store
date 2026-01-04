import { Button } from "@/components/ui/button";
import { ArrowRight, Loader2, Lock } from "lucide-react";

interface SubmitButtonProps {
  readonly isSubmitting: boolean;
  readonly isValidating: boolean;
  readonly isAuthLoading: boolean;
  readonly hasBeenSubmitted: boolean;
  readonly isFormValid: boolean;
  readonly price: number;
  readonly isAuthenticated?: boolean;
}

export function SubmitButton({
  isSubmitting,
  isValidating,
  isAuthLoading,
  hasBeenSubmitted,
  isFormValid,
  price,
  isAuthenticated = false,
}: SubmitButtonProps): JSX.Element {
  const isDisabled =
    isSubmitting || isAuthLoading || isValidating || (hasBeenSubmitted && !isFormValid);

  const getButtonContent = (): JSX.Element => {
    if (isSubmitting) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Processing...</span>
        </div>
      );
    }

    if (isValidating) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Validating...</span>
        </div>
      );
    }

    if (isAuthLoading) {
      return (
        <div className="flex items-center justify-center gap-2">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading...</span>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-center gap-2">
        <span>Continue to checkout</span>
        <span className="font-bold">— ${price}</span>
        <ArrowRight className="w-5 h-5" />
      </div>
    );
  };

  return (
    <div className="space-y-2 flex flex-col items-center">
      <Button
        type="submit"
        disabled={isDisabled}
        className="btn-primary px-8 py-3 text-lg min-w-[300px] relative transition-all duration-200 hover:scale-[1.02]"
      >
        {getButtonContent()}
      </Button>

      {/* Trust message */}
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <Lock className="w-3 h-3" />
        <span>
          {isAuthenticated
            ? "Secure checkout · No charge until payment confirmed"
            : "Sign-in required · No charge until payment confirmed"}
        </span>
      </div>
    </div>
  );
}
