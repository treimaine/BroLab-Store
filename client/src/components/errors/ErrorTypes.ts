// Error types for better categorization
export enum ErrorType {
  NETWORK = "network",
  PAYMENT = "payment",
  VALIDATION = "validation",
  SERVER = "server",
  AUTHENTICATION = "authentication",
  GEOLOCATION = "geolocation",
}

export interface ErrorInfo {
  type: ErrorType;
  message: string;
  details?: string;
  timestamp: Date;
  retry?: () => void;
  actionLabel?: string;
}

export interface EnhancedErrorContextType {
  errors: ErrorInfo[];
  addError: (error: ErrorInfo) => void;
  removeError: (index: number) => void;
  clearErrors: () => void;
  networkStatus: "online" | "offline" | "slow";
}
