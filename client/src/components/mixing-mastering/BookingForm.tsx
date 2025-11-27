import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MixingMasteringSubmissionInput } from "@shared/validation";
import { Mail, Phone, User } from "lucide-react";
import { FileUploadSection } from "./FileUploadSection";
import { FormField } from "./FormField";
import { FormProgressBar } from "./FormProgressBar";
import { FormSelect } from "./FormSelect";
import { FormStatusMessages } from "./FormStatusMessages";
import { FormTextarea } from "./FormTextarea";
import { SubmitButton } from "./SubmitButton";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface AuthState {
  isLoading: boolean;
  isAuthenticated: boolean;
}

interface BookingFormProps {
  readonly selectedServiceData: Service | undefined;
  readonly authState: AuthState;
  readonly formData: MixingMasteringSubmissionInput;
  readonly isFormValid: boolean;
  readonly isValidating: boolean;
  readonly hasBeenSubmitted: boolean;
  readonly isSubmitting: boolean;
  readonly uploadedFiles: File[];
  readonly fileUploadErrors: string[];
  readonly timeSlots: string[];
  readonly onInputChange: (field: keyof MixingMasteringSubmissionInput, value: string) => void;
  readonly onBlur: (field: keyof MixingMasteringSubmissionInput) => void;
  readonly onSubmit: (e: React.FormEvent) => void;
  readonly onFileUploadSuccess: (file: File) => void;
  readonly onFileUploadError: (error: {
    message: string;
    code: string;
    severity?: "warning" | "error";
    recoverable?: boolean;
  }) => void;
  readonly onFileRemove: (index: number) => void;
  readonly getFieldError: (field: string) => string | undefined;
}

const GENRE_OPTIONS = [
  { value: "hip-hop", label: "Hip Hop" },
  { value: "trap", label: "Trap" },
  { value: "r&b", label: "R&B" },
  { value: "afrobeat", label: "Afrobeat" },
  { value: "pop", label: "Pop" },
  { value: "rock", label: "Rock" },
  { value: "electronic", label: "Electronic" },
  { value: "other", label: "Other" },
];

const PLACEHOLDERS = {
  name: {
    loading: "Loading your name...",
    authenticated: "Your name will be auto-filled",
    default: "Enter your full name",
  },
  email: {
    loading: "Loading your email...",
    authenticated: "Your email will be auto-filled",
    default: "your@email.com",
  },
  phone: {
    loading: "Loading your phone...",
    authenticated: "Your phone will be auto-filled",
    default: "(123) 456-7890",
  },
};

function getPlaceholder(
  field: "name" | "email" | "phone",
  authState: { isLoading: boolean; isAuthenticated: boolean }
): string {
  if (authState.isLoading) {
    return PLACEHOLDERS[field].loading;
  }
  if (authState.isAuthenticated) {
    return PLACEHOLDERS[field].authenticated;
  }
  return PLACEHOLDERS[field].default;
}

export function BookingForm({
  selectedServiceData,
  authState,
  formData,
  isFormValid,
  isValidating,
  hasBeenSubmitted,
  isSubmitting,
  uploadedFiles,
  fileUploadErrors,
  timeSlots,
  onInputChange,
  onBlur,
  onSubmit,
  onFileUploadSuccess,
  onFileUploadError,
  onFileRemove,
  getFieldError,
}: BookingFormProps): JSX.Element {
  return (
    <Card className="max-w-4xl mx-auto card-dark">
      <CardHeader>
        <CardTitle className="text-2xl text-white text-center">Reserve Your Session</CardTitle>
        <p className="text-center text-gray-300">
          Selected: {selectedServiceData?.name} - ${selectedServiceData?.price}
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Personal Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormField
              label="Full Name *"
              value={formData.name}
              onChange={(value: string) => onInputChange("name", value)}
              onBlur={() => onBlur("name")}
              error={getFieldError("name")}
              placeholder={getPlaceholder("name", authState)}
              required
              disabled={authState.isLoading || isValidating}
              icon={<User className="w-4 h-4" />}
              isLoading={authState.isLoading}
              isAutoFilled={authState.isAuthenticated && !!formData.name && !authState.isLoading}
            />

            <FormField
              label="Email *"
              type="email"
              value={formData.email}
              onChange={(value: string) => onInputChange("email", value)}
              onBlur={() => onBlur("email")}
              error={getFieldError("email")}
              placeholder={getPlaceholder("email", authState)}
              required
              disabled={authState.isLoading || isValidating}
              icon={<Mail className="w-4 h-4" />}
              isLoading={authState.isLoading}
              isAutoFilled={authState.isAuthenticated && !!formData.email && !authState.isLoading}
            />

            <FormField
              label="Phone Number"
              type="tel"
              value={formData.phone || ""}
              onChange={(value: string) => onInputChange("phone", value)}
              onBlur={() => onBlur("phone")}
              error={getFieldError("phone")}
              placeholder={getPlaceholder("phone", authState)}
              disabled={authState.isLoading || isValidating}
              icon={<Phone className="w-4 h-4" />}
              isLoading={authState.isLoading}
              isAutoFilled={authState.isAuthenticated && !!formData.phone && !authState.isLoading}
            />

            <FormField
              label="Preferred Date *"
              type="date"
              value={formData.preferredDate}
              onChange={(value: string) => onInputChange("preferredDate", value)}
              onBlur={() => onBlur("preferredDate")}
              error={getFieldError("preferredDate")}
              placeholder=""
              required
              disabled={isValidating}
              min={new Date().toISOString().split("T")[0]}
            />

            <FormSelect
              label="Preferred Time"
              value={formData.timeSlot}
              onChange={(value: string) => onInputChange("timeSlot", value)}
              options={timeSlots.map(slot => ({ value: slot, label: slot }))}
              placeholder="Select a time slot"
              error={getFieldError("timeSlot")}
              disabled={isValidating}
              required
            />

            <FormField
              label="Number of Tracks"
              type="number"
              value={formData.trackCount || ""}
              onChange={(value: string) => onInputChange("trackCount", value)}
              onBlur={() => onBlur("trackCount")}
              error={getFieldError("trackCount")}
              placeholder="e.g., 1"
              disabled={isValidating}
              min="1"
              max="100"
            />

            <FormSelect
              label="Genre"
              value={formData.genre || ""}
              onChange={(value: string) => onInputChange("genre", value)}
              options={GENRE_OPTIONS}
              placeholder="Select genre"
              disabled={isValidating}
            />

            <FormField
              label="Reference Track (Optional)"
              value={formData.reference || ""}
              onChange={(value: string) => onInputChange("reference", value)}
              onBlur={() => onBlur("reference")}
              error={getFieldError("reference")}
              placeholder="Link to reference track"
              disabled={isValidating}
            />
          </div>

          <FormTextarea
            label="Project Details"
            value={formData.projectDetails}
            onChange={(value: string) => onInputChange("projectDetails", value)}
            onBlur={() => onBlur("projectDetails")}
            error={getFieldError("projectDetails")}
            placeholder="Tell us about your project, what you're looking for, and any specific requirements... (minimum 20 characters)"
            required
            disabled={isValidating}
            rows={4}
            maxLength={2000}
          />

          <FormTextarea
            label="Special Requests"
            value={formData.specialRequests || ""}
            onChange={(value: string) => onInputChange("specialRequests", value)}
            onBlur={() => onBlur("specialRequests")}
            error={getFieldError("specialRequests")}
            placeholder="Any special requests or additional notes..."
            disabled={isValidating}
            rows={3}
            maxLength={1000}
          />

          <FileUploadSection
            uploadedFiles={uploadedFiles}
            fileUploadErrors={fileUploadErrors}
            onFileUploadSuccess={onFileUploadSuccess}
            onFileUploadError={onFileUploadError}
            onFileRemove={onFileRemove}
          />

          <div className="text-center">
            <SubmitButton
              isSubmitting={isSubmitting}
              isValidating={isValidating}
              isAuthLoading={authState.isLoading}
              hasBeenSubmitted={hasBeenSubmitted}
              isFormValid={isFormValid}
              price={selectedServiceData?.price || 0}
            />

            <FormStatusMessages
              authState={authState}
              hasBeenSubmitted={hasBeenSubmitted}
              isFormValid={isFormValid}
              isValidating={isValidating}
              isSubmitting={isSubmitting}
              fileUploadErrors={fileUploadErrors}
              uploadedFiles={uploadedFiles}
            />

            <FormProgressBar
              formData={formData}
              isAuthLoading={authState.isLoading}
              isSubmitting={isSubmitting}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
