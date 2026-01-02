import { MixingMasteringErrorBoundary } from "@/components/errors/MixingMasteringErrorBoundary";
import { render, screen } from "@testing-library/react";

// Mock child component that can throw errors
function ThrowError({ shouldThrow, errorType }: { shouldThrow: boolean; errorType?: string }) {
  if (shouldThrow) {
    const error = new Error(errorType === "auth" ? "Authentication failed" : "Generic error");
    if (errorType === "auth") {
      error.name = "ClerkError";
    }
    throw error;
  }
  return <div>Normal content</div>;
}

describe("MixingMasteringErrorBoundary", () => {
  // Suppress console.error for these tests
  const originalError = console.error;
  beforeAll(() => {
    console.error = jest.fn();
  });
  afterAll(() => {
    console.error = originalError;
  });

  it("renders children when there is no error", () => {
    render(
      <MixingMasteringErrorBoundary>
        <ThrowError shouldThrow={false} />
      </MixingMasteringErrorBoundary>
    );

    expect(screen.getByText("Normal content")).toBeInTheDocument();
  });

  it("renders authentication error UI for auth errors", () => {
    render(
      <MixingMasteringErrorBoundary>
        <ThrowError shouldThrow={true} errorType="auth" />
      </MixingMasteringErrorBoundary>
    );

    expect(screen.getByText("Authentication Issue")).toBeInTheDocument();
    expect(screen.getByText(/authentication.*sign in/i)).toBeInTheDocument();
    expect(screen.getByText("Sign In")).toBeInTheDocument();
    expect(screen.getByText("Continue Without Sign In")).toBeInTheDocument();
  });

  it("renders generic error UI for non-auth errors", () => {
    render(
      <MixingMasteringErrorBoundary>
        <ThrowError shouldThrow={true} errorType="generic" />
      </MixingMasteringErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it("calls onAuthError callback for authentication errors", () => {
    const onAuthError = jest.fn();

    render(
      <MixingMasteringErrorBoundary onAuthError={onAuthError}>
        <ThrowError shouldThrow={true} errorType="auth" />
      </MixingMasteringErrorBoundary>
    );

    expect(onAuthError).toHaveBeenCalled();
  });

  it("shows retry button for generic errors", () => {
    render(
      <MixingMasteringErrorBoundary>
        <ThrowError shouldThrow={true} errorType="generic" />
      </MixingMasteringErrorBoundary>
    );

    expect(screen.getByText("Something went wrong")).toBeInTheDocument();
    expect(screen.getByText("Try Again")).toBeInTheDocument();
    expect(screen.getByText("Refresh Page")).toBeInTheDocument();
  });

  it("shows helpful message for authentication errors", () => {
    render(
      <MixingMasteringErrorBoundary>
        <ThrowError shouldThrow={true} errorType="auth" />
      </MixingMasteringErrorBoundary>
    );

    expect(screen.getByText("Good news:")).toBeInTheDocument();
    expect(screen.getByText(/browse our mixing & mastering services/i)).toBeInTheDocument();
  });

  it("provides contact options", () => {
    render(
      <MixingMasteringErrorBoundary>
        <ThrowError shouldThrow={true} errorType="generic" />
      </MixingMasteringErrorBoundary>
    );

    expect(screen.getByText("Report Issue")).toBeInTheDocument();
    expect(screen.getByText("beats store")).toBeInTheDocument();
    expect(screen.getByText("contact us")).toBeInTheDocument();
  });
});
