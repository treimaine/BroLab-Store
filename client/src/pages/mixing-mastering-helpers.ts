/**
 * Mixing & Mastering Page Helper Functions
 * Extracted to reduce cognitive complexity
 */

/**
 * Calculate form completion percentage
 */
export function calculateFormCompletion(formData: {
  name: string;
  email: string;
  preferredDate: string;
  timeSlot: string;
  projectDetails: string;
}): number {
  const fields = [
    formData.name,
    formData.email,
    formData.preferredDate,
    formData.timeSlot,
    formData.projectDetails,
  ];

  const filledFields = fields.filter(Boolean).length;
  return Math.round((filledFields / fields.length) * 100);
}

/**
 * Get placeholder text based on auth state
 */
export function getPlaceholderText(
  isLoading: boolean,
  isAuthenticated: boolean,
  fieldType: "name" | "email" | "phone"
): string {
  if (isLoading) {
    const loadingTexts = {
      name: "Loading your information...",
      email: "Loading your email...",
      phone: "Loading your phone...",
    };
    return loadingTexts[fieldType];
  }

  if (isAuthenticated) {
    const authTexts = {
      name: "Your name will be auto-filled",
      email: "Your email will be auto-filled",
      phone: "Your phone will be auto-filled",
    };
    return authTexts[fieldType];
  }

  const defaultTexts = {
    name: "Enter your full name",
    email: "your@email.com",
    phone: "(123) 456-7890",
  };
  return defaultTexts[fieldType];
}

/**
 * Get input className based on state
 */
export function getInputClassName(
  isLoading: boolean,
  isAuthenticated: boolean,
  hasValue: boolean,
  hasError: boolean
): string {
  const baseClasses = `pl-10 ${isLoading ? "pr-10" : ""} bg-[var(--medium-gray)] border-gray-600 text-white`;
  const errorClass = hasError ? "border-red-500" : "";
  const successClass =
    isAuthenticated && hasValue && !hasError ? "border-green-500/50 bg-green-900/10" : "";

  return `${baseClasses} ${errorClass} ${successClass}`.trim();
}

/**
 * Build reservation notes from form data
 */
export function buildReservationNotes(
  projectDetails: string,
  specialRequests: string,
  reference: string,
  uploadedFiles: File[],
  fileUploadErrors: string[]
): string {
  let notes = `${projectDetails}\n\nSpecial Requests: ${specialRequests}\n\nReference Track: ${reference}`;

  // Add file upload status
  if (uploadedFiles.length > 0) {
    const fileNames = uploadedFiles.map(f => f.name).join(", ");
    const fileCount = uploadedFiles.length;
    notes += `\n\nFiles Uploaded: ${fileNames} (${fileCount} file${fileCount > 1 ? "s" : ""})`;
  } else {
    notes +=
      "\n\nFiles: Client will provide files via email or cloud storage after booking confirmation.";
  }

  // Add file upload error context
  if (fileUploadErrors.length > 0) {
    notes += `\n\nNote: Client experienced file upload issues during booking but chose to proceed. Files can be sent separately.`;
  }

  return notes.trim();
}
