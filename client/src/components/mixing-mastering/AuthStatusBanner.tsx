import { AlertCircle, Info, Loader2 } from "lucide-react";

interface AuthStatusBannerProps {
  readonly isLoading: boolean;
  readonly isAuthenticated: boolean;
  readonly hasError: boolean;
  readonly errorMessage: string | null;
}

export function AuthStatusBanner({
  isLoading,
  isAuthenticated,
  hasError,
  errorMessage,
}: AuthStatusBannerProps) {
  if (isLoading) {
    return (
      <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-center justify-center text-blue-300">
          <Loader2 className="animate-spin h-5 w-5 mr-3" />
          <div className="text-center">
            <p className="font-medium">Loading authentication...</p>
            <p className="text-xs text-blue-400 mt-1">Preparing your personalized experience</p>
          </div>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
        <div className="flex items-center justify-center text-yellow-300">
          <AlertCircle className="w-5 h-5 mr-2" />
          <p className="text-center">
            <strong>Authentication Notice:</strong>{" "}
            {errorMessage ||
              "Authentication is temporarily unavailable, but you can still browse our services."}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-lg">
        <div className="flex items-start gap-4">
          <div className="flex-shrink-0">
            <Info className="w-6 h-6 text-blue-400" />
          </div>
          <div className="flex-1">
            <h3 className="text-blue-300 font-semibold mb-2">Quick Start Tips</h3>
            <div className="space-y-2 text-sm">
              <div className="flex items-center gap-2 text-blue-200">
                <span>
                  <strong>Sign in</strong> to auto-fill your contact information and track orders
                </span>
              </div>
              <div className="flex items-center gap-2 text-blue-200">
                <span>
                  <strong>No account needed</strong> to browse services and get quotes
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
