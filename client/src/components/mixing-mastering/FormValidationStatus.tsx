import { AlertCircle, AlertTriangle } from "lucide-react";

interface FormValidationStatusProps {
  readonly hasBeenSubmitted: boolean;
  readonly isFormValid: boolean;
  readonly formErrors: Record<string, string | undefined>;
  readonly retryCount: number;
}

export function FormValidationStatus({
  hasBeenSubmitted,
  isFormValid,
  formErrors,
  retryCount,
}: FormValidationStatusProps) {
  return (
    <>
      {hasBeenSubmitted && !isFormValid && (
        <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
          <div className="flex items-center text-red-300">
            <AlertTriangle className="w-5 h-5 mr-2" />
            <div>
              <p className="font-medium">Please fix the following errors:</p>
              <ul className="mt-2 text-sm list-disc list-inside">
                {Object.entries(formErrors).map(([field, error]) =>
                  error ? (
                    <li key={field}>
                      {field.charAt(0).toUpperCase() + field.slice(1)}: {error}
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {retryCount > 0 && (
        <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
          <div className="flex items-center text-yellow-300">
            <AlertCircle className="w-5 h-5 mr-2" />
            <p>Retrying request... (Attempt {retryCount} of 3)</p>
          </div>
        </div>
      )}
    </>
  );
}
