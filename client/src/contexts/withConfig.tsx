/**
 * Higher-order component for configuration
 * @deprecated Use hooks directly instead
 */

import { ConfigProvider } from "./ConfigContext";
import type { ConfigProviderProps } from "./ConfigContextTypes";

/**
 * Higher-order component to provide configuration
 * @deprecated Use hooks directly instead
 */
export function withConfig<P extends object>(
  Component: React.ComponentType<P>
): React.ComponentType<P & { configProviderProps?: Partial<ConfigProviderProps> }> {
  return function WithConfigComponent({ configProviderProps, ...props }) {
    return (
      <ConfigProvider {...configProviderProps}>
        <Component {...(props as P)} />
      </ConfigProvider>
    );
  };
}
