// File upload handler types and utilities

export interface FileUploadState {
  isUploading: boolean;
  fileName?: string;
  progress?: number;
  status?: "uploading" | "scanning" | "completed" | "error";
}

export interface FileUploadError {
  message: string;
  code: string;
  recoverable?: boolean;
  severity?: "warning" | "error";
}

export const createFileUploadHandlers = (
  setFileUploadState: (
    state: FileUploadState | ((prev: FileUploadState) => FileUploadState)
  ) => void,
  setUploadedFiles: (files: File[] | ((prev: File[]) => File[])) => void,
  toast: (options: {
    title: string;
    description: string;
    variant?: "default" | "destructive";
  }) => void
) => ({
  onUploadStart: (file: File) => {
    setFileUploadState({
      isUploading: true,
      fileName: file.name,
      progress: 0,
      status: "uploading",
    });
  },

  onUploadProgress: (progress: number) => {
    setFileUploadState(prev => ({
      ...prev,
      progress,
      status: progress < 100 ? "uploading" : "scanning",
    }));
  },

  onUploadSuccess: (file: File) => {
    setFileUploadState({
      isUploading: false,
      fileName: file.name,
      progress: 100,
      status: "completed",
    });

    setUploadedFiles(prev => [...prev, file]);

    toast({
      title: "File Uploaded Successfully",
      description: `${file.name} has been uploaded and scanned for security.`,
      variant: "default",
    });

    setTimeout(() => {
      setFileUploadState({ isUploading: false });
    }, 3000);
  },

  onUploadError: (error: FileUploadError, fileName?: string) => {
    console.error("File upload error:", error);

    setFileUploadState({
      isUploading: false,
      fileName,
      status: "error",
    });

    toast({
      title: "File Upload Failed",
      description: error.message,
      variant: "destructive",
    });

    setTimeout(() => {
      setFileUploadState({ isUploading: false });
    }, 5000);
  },
});
