import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MixingMasteringSubmissionInput } from "@shared/validation";
import { Calendar, ChevronDown, FileText, Info, Mail, User } from "lucide-react";
import { useState } from "react";
import { FileUploadSection } from "./FileUploadSection";
import { FormField } from "./FormField";
import { FormSelect } from "./FormSelect";
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
    loading: "Loading...",
    authenticated: "Auto-filled from account",
    default: "Your full name",
  },
  email: {
    loading: "Loading...",
    authenticated: "Auto-filled from account",
    default: "your@email.com",
  },
};

function getPlaceholder(
  field: "name" | "email",
  authState: { isLoading: boolean; isAuthenticated: boolean }
): string {
  if (authState.isLoading) return PLACEHOLDERS[field].loading;
  if (authState.isAuthenticated) return PLACEHOLDERS[field].authenticated;
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
  const [showExtras, setShowExtras] = useState(false);

  return (
    <Card className="max-w-3xl mx-auto card-dark">
      <CardHeader className="text-center pb-2">
        <CardTitle className="text-xl sm:text-2xl text-white">Complete Your Booking</CardTitle>
        <p className="text-sm text-gray-400 mt-1">
          {selectedServiceData?.name} · ${selectedServiceData?.price}
        </p>
      </CardHeader>

      <CardContent>
        <form onSubmit={onSubmit} className="space-y-6">
          {/* Section 1: Essential Info */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <User className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Contact Info</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Full Name"
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
                label="Email"
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
            </div>
          </div>

          {/* Section 2: Schedule */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <Calendar className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Schedule</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Preferred Date"
                type="date"
                value={formData.preferredDate}
                onChange={(value: string) => onInputChange("preferredDate", value)}
                onBlur={() => onBlur("preferredDate")}
                error={getFieldError("preferredDate")}
                placeholder=""
                required
                disabled={isValidating}
                min={new Date().toISOString().split("T")[0]}
                icon={<Calendar className="w-4 h-4" />}
              />

              <FormSelect
                label="Time Slot"
                value={formData.timeSlot}
                onChange={(value: string) => onInputChange("timeSlot", value)}
                options={timeSlots.map(slot => ({ value: slot, label: slot }))}
                placeholder="Select time"
                error={getFieldError("timeSlot")}
                disabled={isValidating}
                required
              />
            </div>
          </div>

          {/* Section 3: Project Details */}
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-white font-medium mb-3">
              <FileText className="w-4 h-4 text-[var(--accent-purple)]" />
              <span>Project Details</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <FormField
                label="Number of Tracks"
                type="number"
                value={formData.trackCount || "1"}
                onChange={(value: string) => onInputChange("trackCount", value)}
                onBlur={() => onBlur("trackCount")}
                error={getFieldError("trackCount")}
                placeholder="1"
                disabled={isValidating}
                min="1"
                max="100"
              />

              <FormSelect
                label="Genre (optional)"
                value={formData.genre || ""}
                onChange={(value: string) => onInputChange("genre", value)}
                options={GENRE_OPTIONS}
                placeholder="Select genre"
                disabled={isValidating}
              />
            </div>

            <FormTextarea
              label="Tell us about your project"
              value={formData.projectDetails}
              onChange={(value: string) => onInputChange("projectDetails", value)}
              onBlur={() => onBlur("projectDetails")}
              error={getFieldError("projectDetails")}
              placeholder="What sound are you going for? Any specific references or requirements?"
              required
              disabled={isValidating}
              rows={3}
              maxLength={2000}
            />
          </div>

          {/* Section 4: Optional extras (collapsible) */}
          <div className="border border-gray-700 rounded-lg overflow-hidden">
            <Button
              type="button"
              variant="ghost"
              className="w-full flex items-center justify-between px-4 py-3 text-gray-300 hover:text-white hover:bg-gray-800/50"
              onClick={() => setShowExtras(!showExtras)}
            >
              <div className="flex items-center gap-2">
                <Info className="w-4 h-4" />
                <span className="text-sm">Additional options (optional)</span>
              </div>
              <ChevronDown
                className={`w-4 h-4 transition-transform duration-200 ${showExtras ? "rotate-180" : ""}`}
              />
            </Button>

            {showExtras && (
              <div className="px-4 pb-4 space-y-4 border-t border-gray-700 pt-4">
                <FormField
                  label="Phone Number"
                  type="tel"
                  value={formData.phone || ""}
                  onChange={(value: string) => onInputChange("phone", value)}
                  onBlur={() => onBlur("phone")}
                  error={getFieldError("phone")}
                  placeholder="(123) 456-7890"
                  disabled={isValidating}
                />

                <FormField
                  label="Reference Track Link"
                  value={formData.reference || ""}
                  onChange={(value: string) => onInputChange("reference", value)}
                  onBlur={() => onBlur("reference")}
                  error={getFieldError("reference")}
                  placeholder="Spotify, YouTube, or SoundCloud link"
                  disabled={isValidating}
                />

                <FormTextarea
                  label="Special Requests"
                  value={formData.specialRequests || ""}
                  onChange={(value: string) => onInputChange("specialRequests", value)}
                  onBlur={() => onBlur("specialRequests")}
                  error={getFieldError("specialRequests")}
                  placeholder="Any additional notes..."
                  disabled={isValidating}
                  rows={2}
                  maxLength={1000}
                />

                <div className="pt-2">
                  <p className="text-xs text-gray-400 mb-3">
                    Upload your stems now or send a Drive/Dropbox link after booking
                  </p>
                  <FileUploadSection
                    uploadedFiles={uploadedFiles}
                    fileUploadErrors={fileUploadErrors}
                    onFileUploadSuccess={onFileUploadSuccess}
                    onFileUploadError={onFileUploadError}
                    onFileRemove={onFileRemove}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Submit */}
          <div className="pt-4">
            <SubmitButton
              isSubmitting={isSubmitting}
              isValidating={isValidating}
              isAuthLoading={authState.isLoading}
              hasBeenSubmitted={hasBeenSubmitted}
              isFormValid={isFormValid}
              price={selectedServiceData?.price || 0}
              isAuthenticated={authState.isAuthenticated}
            />
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
