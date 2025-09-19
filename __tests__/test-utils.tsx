/**
 * Test utilities for React components with providers
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RenderOptions, render } from "@testing-library/react";
import { ConvexProvider } from "convex/react";
import React, { ReactElement } from "react";

// Mock Convex client
const mockConvexClient = {
  query: jest.fn(),
  mutation: jest.fn(),
  action: jest.fn(),
  subscribe: jest.fn(),
  close: jest.fn(),
  connectionState: jest.fn(() => ({ isWebSocketConnected: true })),
} as any;

// Create a custom render function that includes providers
function customRender(ui: ReactElement, options?: Omit<RenderOptions, "wrapper">) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
      mutations: {
        retry: false,
      },
    },
  });

  function AllTheProviders({ children }: { children: React.ReactNode }) {
    return (
      <ConvexProvider client={mockConvexClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </ConvexProvider>
    );
  }

  return render(ui, { wrapper: AllTheProviders, ...options });
}

// Re-export everything
export * from "@testing-library/react";

// Override render method
export { customRender as render };

// Export mock client for tests that need it
export { mockConvexClient };
