import React from "react";
import type { EnhancedErrorContextType } from "./ErrorTypes";

export const EnhancedErrorContext = React.createContext<EnhancedErrorContextType>({
  errors: [],
  addError: () => {},
  removeError: () => {},
  clearErrors: () => {},
  networkStatus: "online",
});
