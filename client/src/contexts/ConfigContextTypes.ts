/**
 * Configuration Context Types
 * Shared types for configuration context
 */

import type { ValidationResult } from "@/utils/configValidator";
import type { ReactNode } from "react";

export interface ConfigProviderProps {
  readonly children: ReactNode;
  readonly onConfigError?: (error: Error) => void;
  readonly onValidationError?: (validation: ValidationResult) => void;
}
