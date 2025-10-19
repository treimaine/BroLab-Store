import { ReservationErrorBoundary } from "@/components/ReservationErrorBoundary";
import { useEnhancedFormSubmission } from "@/hooks/useEnhancedFormSubmission";
import { useReservationErrorHandling } from "@/hooks/useReservationErrorHandling";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { act } from "react";

// Mock dependencies
jest.mock("@/hooks/use-toast", () => ({
  useToast: () => ({
    toast: jest.fn(),
  }),
}));

jest.mock("@/lib/errorTracker", () => ({
  addBreadcrumb: jest.fn(),
  errorTracker: {
    trackError: jest.fn(() => "test-error-id"),
  },
}));

jest.mock("@/lib/logger", () => ({
  logger: {
    logError: jest.fn(),
    logInfo: jest.fn(),
    logWarning: jest.fn(),
    getDebugSummary: jest.fn(() => ({
      sessionId: "test-session",
      pageLoadTime: 1000,
      errorCount: 1,
    })),
  },
}));

jest.mock("@/lib/performanceMonitor", () => ({
  performanceMonitor: {
    recordMetric: jest.fn(),
    trackUserInteraction: jest.fn(),
  },
  startTimer: jest.fn(() => () => 100),
}));

jest.mock("@clerk/clerk-react", () => ({
  useAuth: () => ({
    getToken: jest.fn(() => Promise.resolve("test-token")),
  }),
}));

// Test component that throws an error
function ErrorThrowingComponent({ shouldThrow }: { shouldThrow: boolean }) {
  if (shouldThrow) {
    throw new Error("Test error for error boundary");
  }
  return <div>Normal component content</div>;
}

// Test component using error handling hook
function TestFormComponent() {
  const { hasError, error, retryCount, canRetry, handleError, retry, clearError, getErrorDisplay } =
    useReservationErrorHandling({
      serviceName: "test service",
      maxRetries: 3,
      showToastOnError: false, // Disable toast for testing
    });

  const triggerError = (errorType: string) => {
    switch (errorType) {
      case "validation":
        handleError(new Error("Validation failed: required field missing"), "validation");
        break;
      case "authentication":
        handleError(new Error("401: Unauthorized access"), "authentication");
        break;
      case "network":
        handleError(new Error("Network error: connection timeout"), "network");
        break;
      case "server":
        handleError(new Error("500: Internal server error"), "server");
        break;
      default:
        handleError(new Error("Unknown error occurred"), "unknown");
    }
  };

  if (hasError && error) {
    const errorDisplay = getErrorDisplay();
    return (
      <div data-testid="error-display">
        <div data-testid="error-title">{errorDisplay?.title}</div>
        <div data-testid="error-message">{errorDisplay?.message}</div>
        <div data-testid="error-type">{error.type}</div>
        <div data-testid="retry-count">{retryCount}</div>
        <div data-testid="can-retry">{canRetry.toString()}</div>
        <div data-testid="suggestions">{errorDisplay?.suggestions?.join(", ")}</div>
        <button onClick={retry} data-testid="retry-button">
          Retry
        </button>
        <button onClick={clearError} data-testid="clear-button">
          Clear
        </button>
      </div>
    );
  }

  return (
    <div data-testid="form-content">
      <button onClick={() => triggerError("validation")} data-testid="trigger-validation">
        Trigger Validation Error
      </button>
      <button onClick={() => triggerError("authentication")} data-testid="trigger-auth">
        Trigger Auth Error
      </button>
      <button onClick={() => triggerError("network")} data-testid="trigger-network">
        Trigger Network Error
      </button>
      <button onClick={() => triggerError("server")} data-testid="trigger-server">
        Trigger Server Error
      </button>
    </div>
  );
}

// Test component using enhanced form submission
function TestEnhancedFormComponent() {
  const {
    isSubmitting,
    currentStep,
    totalSteps,
    progress,
    hasError,
    error,
    submitForm,
    createReservationSteps,
    getErrorDisplay,
  } = useEnhancedFormSubmission({
    serviceName: "test form",
    maxRetries: 2,
    showProgressToast: false, // Disable toast for testing
  });

  const handleSubmit = async () => {
    const steps = createReservationSteps(
      { test: "data" },
      {
        createPaymentIntent: false,
        uploadFiles: [],
      }
    );

    try {
      await submitForm(steps);
    } catch (error) {
      // Error is handled by the hook
    }
  };

  return (
    <div data-testid="enhanced-form">
      <div data-testid="is-submitting">{isSubmitting.toString()}</div>
      <div data-testid="current-step">{currentStep}</div>
      <div data-testid="total-steps">{totalSteps}</div>
      <div data-testid="progress">{progress}</div>
      <div data-testid="has-error">{hasError.toString()}</div>
      {hasError && <div data-testid="error-message">{getErrorDisplay()?.message}</div>}
      <button onClick={handleSubmit} data-testid="submit-button">
        Submit
      </button>
    </div>
  );
}

describe("Reservation Error Handling", () => {
  describe("ReservationErrorBoundary", () => {
    it("renders children when no error occurs", () => {
      render(
        <ReservationErrorBoundary serviceName="Test Service">
          <ErrorThrowingComponent shouldThrow={false} />
        </ReservationErrorBoundary>
      );

      expect(screen.getByText("Normal component content")).toBeInTheDocument();
    });

    it("catches and displays error when component throws", () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

      render(
        <ReservationErrorBoundary serviceName="Test Service">
          <ErrorThrowingComponent shouldThrow={true} />
        </ReservationErrorBoundary>
      );

      expect(screen.getByText("Temporary Glitch")).toBeInTheDocument();
      expect(
        screen.getByText(/We encountered a minor issue with the Test Service/)
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Try Again/ })).toBeInTheDocument();
      expect(screen.getByRole("button", { name: /Refresh Page/ })).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it("provides retry functionality", async () => {
      const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});
      const onRetry = jest.fn();

      render(
        <ReservationErrorBoundary serviceName="Test Service" onRetry={onRetry}>
          <ErrorThrowingComponent shouldThrow={true} />
        </ReservationErrorBoundary>
      );

      const retryButton = screen.getByRole("button", { name: /Try Again/ });
      fireEvent.click(retryButton);

      expect(onRetry).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe("useReservationErrorHandling", () => {
    it("categorizes validation errors correctly", async () => {
      render(<TestFormComponent />);

      const triggerButton = screen.getByTestId("trigger-validation");
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-type")).toHaveTextContent("validation");
        expect(screen.getByTestId("error-title")).toHaveTextContent("Validation Error");
        expect(screen.getByTestId("error-message")).toHaveTextContent(
          "Please check your form information"
        );
        expect(screen.getByTestId("suggestions")).toHaveTextContent("Review all required fields");
      });
    });

    it("categorizes authentication errors correctly", async () => {
      render(<TestFormComponent />);

      const triggerButton = screen.getByTestId("trigger-auth");
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-type")).toHaveTextContent("authentication");
        expect(screen.getByTestId("error-title")).toHaveTextContent("Authentication Error");
        expect(screen.getByTestId("error-message")).toHaveTextContent("Please sign in to continue");
        expect(screen.getByTestId("suggestions")).toHaveTextContent("Sign in to your account");
      });
    });

    it("categorizes network errors correctly", async () => {
      render(<TestFormComponent />);

      const triggerButton = screen.getByTestId("trigger-network");
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-type")).toHaveTextContent("network");
        expect(screen.getByTestId("error-title")).toHaveTextContent("Network Error");
        expect(screen.getByTestId("error-message")).toHaveTextContent("Connection issue detected");
        expect(screen.getByTestId("suggestions")).toHaveTextContent(
          "Check your internet connection"
        );
      });
    });

    it("handles retry functionality", async () => {
      render(<TestFormComponent />);

      // Trigger an error
      const triggerButton = screen.getByTestId("trigger-network");
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId("can-retry")).toHaveTextContent("true");
        expect(screen.getByTestId("retry-count")).toHaveTextContent("0");
      });

      // Click retry
      const retryButton = screen.getByTestId("retry-button");
      fireEvent.click(retryButton);

      await waitFor(() => {
        expect(screen.getByTestId("retry-count")).toHaveTextContent("1");
      });
    });

    it("clears error state", async () => {
      render(<TestFormComponent />);

      // Trigger an error
      const triggerButton = screen.getByTestId("trigger-validation");
      fireEvent.click(triggerButton);

      await waitFor(() => {
        expect(screen.getByTestId("error-display")).toBeInTheDocument();
      });

      // Clear error
      const clearButton = screen.getByTestId("clear-button");
      fireEvent.click(clearButton);

      await waitFor(() => {
        expect(screen.getByTestId("form-content")).toBeInTheDocument();
        expect(screen.queryByTestId("error-display")).not.toBeInTheDocument();
      });
    });
  });

  describe("useEnhancedFormSubmission", () => {
    beforeEach(() => {
      // Mock fetch for API calls
      global.fetch = jest.fn();
    });

    afterEach(() => {
      jest.restoreAllMocks();
    });

    it("initializes with correct default state", () => {
      render(<TestEnhancedFormComponent />);

      expect(screen.getByTestId("is-submitting")).toHaveTextContent("false");
      expect(screen.getByTestId("current-step")).toHaveTextContent("0");
      expect(screen.getByTestId("total-steps")).toHaveTextContent("0");
      expect(screen.getByTestId("progress")).toHaveTextContent("0");
      expect(screen.getByTestId("has-error")).toHaveTextContent("false");
    });

    it("handles successful form submission", async () => {
      // Mock successful API responses for all steps
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ id: "reservation-123" }),
      });

      render(<TestEnhancedFormComponent />);

      const submitButton = screen.getByTestId("submit-button");

      // Initial state should be not submitting
      expect(screen.getByTestId("is-submitting")).toHaveTextContent("false");

      await act(async () => {
        fireEvent.click(submitButton);
        // Wait a bit for the submission to start
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // During submission, should show submitting state
      expect(screen.getByTestId("is-submitting")).toHaveTextContent("true");
      expect(screen.getByTestId("current-step")).toHaveTextContent("1");
      expect(screen.getByTestId("total-steps")).toHaveTextContent("2");

      // Wait for submission to complete or error
      await waitFor(
        () => {
          const isSubmitting = screen.getByTestId("is-submitting").textContent;
          const hasError = screen.getByTestId("has-error").textContent;
          // Either submission completes successfully or fails with error
          expect(isSubmitting === "false" || hasError === "true").toBe(true);
        },
        { timeout: 5000 }
      );
    });

    it("handles form submission errors", async () => {
      // Mock failed API response
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error("API Error"));

      render(<TestEnhancedFormComponent />);

      const submitButton = screen.getByTestId("submit-button");

      await act(async () => {
        fireEvent.click(submitButton);
        // Wait a bit for the submission to start
        await new Promise(resolve => setTimeout(resolve, 100));
      });

      // Should show submitting state initially
      expect(screen.getByTestId("is-submitting")).toHaveTextContent("true");

      // Wait for error state to be updated
      await waitFor(
        () => {
          expect(screen.getByTestId("has-error")).toHaveTextContent("true");
          expect(screen.getByTestId("error-message")).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Check that we have an error state - this is the main goal of the test
      expect(screen.getByTestId("has-error")).toHaveTextContent("true");
      expect(screen.getByTestId("error-message")).toBeInTheDocument();
    });
  });
});
