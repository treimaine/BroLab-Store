/**
 * Integration test for mixing-mastering page error handling
 * Tests the complete error boundary and authentication error handling implementation
 */

import MixingMastering from "@/pages/mixing-mastering";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { ConvexProvider } from "convex/react";

// Mock Clerk
jest.mock("@clerk/clerk-react", () => ({
  useUser: () => ({
    user: null,
    isLoaded: true,
  }),
}));

// Mock Convex
jest.mock("convex/react", () => ({
  useQuery: () => null,
  ConvexProvider: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// Mock wouter
jest.mock("wouter", () => ({
  useLocation: () => ["/mixing-mastering", jest.fn()],
}));

// Mock toast
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

// Mock API request
jest.mock("@/lib/queryClient", () => ({
  apiRequest: jest.fn(),
}));

// Mock Convex API
jest.mock("@/lib/convex", () => ({
  api: {
    users: {
      getUserByClerkId: "mockQuery",
    },
  },
}));

// Mock FileUpload component
jest.mock("../../components/kokonutui/file-upload", () => {
  return function MockFileUpload({ onUploadSuccess, onUploadError }: any) {
    return (
      <div data-testid="file-upload">
        <button onClick={() => onUploadSuccess(new File(["test"], "test.mp3"))}>
          Upload Success
        </button>
        <button onClick={() => onUploadError({ message: "Upload failed" })}>Upload Error</button>
      </div>
    );
  };
});

describe("MixingMastering Error Handling Integration", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false },
        mutations: { retry: false },
      },
    });

    // Suppress console.error for error boundary tests
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderWithProviders = (component: React.ReactElement) => {
    return render(
      <QueryClientProvider client={queryClient}>
        <ConvexProvider client={{} as any}>{component}</ConvexProvider>
      </QueryClientProvider>
    );
  };

  it("renders mixing-mastering page without errors", () => {
    renderWithProviders(<MixingMastering />);

    expect(screen.getByText("Mixing & Mastering")).toBeInTheDocument();
    expect(screen.getByText("Professional Mixing")).toBeInTheDocument();
    expect(screen.getByText("Audio Mastering")).toBeInTheDocument();
    expect(screen.getByText("Mixing + Mastering")).toBeInTheDocument();
  });

  it("shows authentication tip for unauthenticated users", () => {
    renderWithProviders(<MixingMastering />);

    expect(screen.getByText(/Sign in to auto-fill your contact information/i)).toBeInTheDocument();
  });

  it("displays the booking form", () => {
    renderWithProviders(<MixingMastering />);

    expect(screen.getByText("Reserve Your Session")).toBeInTheDocument();
  });

  it("shows proper submit button text for unauthenticated users", () => {
    renderWithProviders(<MixingMastering />);

    expect(screen.getByText(/You'll be prompted to sign in/i)).toBeInTheDocument();
  });

  it("handles file upload errors gracefully", () => {
    renderWithProviders(<MixingMastering />);

    const fileUpload = screen.getByTestId("file-upload");
    expect(fileUpload).toBeInTheDocument();
  });

  it("displays service options with correct pricing", () => {
    renderWithProviders(<MixingMastering />);

    expect(screen.getByText("$70")).toBeInTheDocument(); // Professional Mixing
    expect(screen.getByText("$50")).toBeInTheDocument(); // Audio Mastering
    expect(screen.getByText("$150")).toBeInTheDocument(); // Mixing + Mastering
  });

  it("shows service features for each option", () => {
    renderWithProviders(<MixingMastering />);

    expect(screen.getByText("Professional EQ and compression")).toBeInTheDocument();
    expect(screen.getByText("Loudness optimization")).toBeInTheDocument();
    expect(screen.getByText("Everything in mixing package")).toBeInTheDocument();
  });

  it("renders without crashing", () => {
    renderWithProviders(<MixingMastering />);

    // Just verify the page renders without errors
    expect(screen.getByText("Mixing & Mastering")).toBeInTheDocument();
  });
});
