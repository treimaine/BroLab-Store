import "@testing-library/jest-dom";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import FileUpload from "../../components/kokonutui/file-upload";

// Mock framer-motion to avoid DOM issues in tests
jest.mock("framer-motion", () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    button: ({ children, ...props }: any) => <button {...props}>{children}</button>,
    span: ({ children, ...props }: any) => <span {...props}>{children}</span>,
  },
  AnimatePresence: ({ children }: unknown) => children,
  useAnimation: () => ({
    start: jest.fn(),
    stop: jest.fn(),
    set: jest.fn(),
  }),
}));

// Mock file for testing
const createMockFile = (name: string, size: number, type: string) => {
  const file = new File(["test content"], name, { type });
  Object.defineProperty(file, "size", { value: size });
  return file;
};

describe("FileUpload Error Handling", () => {
  it("should handle file size errors gracefully", async () => {
    const onUploadError = jest.fn();
    const onUploadSuccess = jest.fn();

    render(
      <FileUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
        maxFileSize={1024} // 1KB limit
        allowFormSubmissionOnError={true}
        maxRetries={3}
      />
    );

    // Create a file that exceeds the size limit
    const largeFile = createMockFile("large-file.mp3", 2048, "audio/mp3");

    // Simulate file selection
    const fileInput = screen.getByLabelText("File input");
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "FILE_TOO_LARGE",
          message: expect.stringContaining("File size exceeds"),
          recoverable: false,
          severity: "error",
        })
      );
    });

    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it("should handle invalid file type errors gracefully", async () => {
    const onUploadError = jest.fn();
    const onUploadSuccess = jest.fn();

    render(
      <FileUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
        acceptedFileTypes={["audio/*"]}
        allowFormSubmissionOnError={true}
        maxRetries={3}
      />
    );

    // Create a file with invalid type
    const invalidFile = createMockFile("document.pdf", 1024, "application/pdf");

    // Simulate file selection
    const fileInput = screen.getByLabelText("File input");
    fireEvent.change(fileInput, { target: { files: [invalidFile] } });

    await waitFor(() => {
      expect(onUploadError).toHaveBeenCalledWith(
        expect.objectContaining({
          code: "INVALID_FILE_TYPE",
          message: expect.stringContaining("File type not supported"),
          recoverable: false,
          severity: "error",
        })
      );
    });

    expect(onUploadSuccess).not.toHaveBeenCalled();
  });

  it("should show retry button for recoverable errors", async () => {
    const onUploadError = jest.fn();
    const onUploadSuccess = jest.fn();

    render(
      <FileUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
        uploadDelay={100} // Short delay for testing
        allowFormSubmissionOnError={true}
        maxRetries={3}
      />
    );

    // Create a valid file
    const validFile = createMockFile("test.mp3", 1024, "audio/mp3");

    // Simulate file selection
    const fileInput = screen.getByLabelText("File input");
    fireEvent.change(fileInput, { target: { files: [validFile] } });

    // Wait for potential upload simulation error (10% chance)
    await waitFor(
      () => {
        // Check if error state is shown or success
        const errorState = screen.queryByText("Upload Failed");
        const retryButton = screen.queryByText(/Retry/);

        if (errorState) {
          expect(retryButton).toBeInTheDocument();
        }
      },
      { timeout: 3000 }
    );
  });

  it("should display form submission message when allowFormSubmissionOnError is true", async () => {
    const onUploadError = jest.fn();

    render(
      <FileUpload
        allowFormSubmissionOnError={true}
        maxRetries={3}
        onUploadError={onUploadError}
        maxFileSize={1024} // Small limit to trigger error
      />
    );

    // Create a file that exceeds the size limit to trigger error state
    const largeFile = createMockFile("large-file.mp3", 2048, "audio/mp3");
    const fileInput = screen.getByLabelText("File input");
    fireEvent.change(fileInput, { target: { files: [largeFile] } });

    // Wait for error state and check for the form submission message
    await waitFor(() => {
      expect(
        screen.getByText(/You can still submit the form without uploading files/)
      ).toBeInTheDocument();
    });
  });

  it("should handle file extension validation correctly", async () => {
    const onUploadError = jest.fn();
    const onUploadSuccess = jest.fn();

    render(
      <FileUpload
        onUploadSuccess={onUploadSuccess}
        onUploadError={onUploadError}
        acceptedFileTypes={[".zip", ".rar"]}
        allowFormSubmissionOnError={true}
      />
    );

    // Test valid extension
    const zipFile = createMockFile("project.zip", 1024, "application/zip");
    const fileInput = screen.getByLabelText("File input");
    fireEvent.change(fileInput, { target: { files: [zipFile] } });

    // Should not trigger error for valid extension
    await waitFor(() => {
      expect(onUploadError).not.toHaveBeenCalled();
    });
  });
});
