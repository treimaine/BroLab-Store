import { addBreadcrumb } from "@/lib/errorTracker";
import { logUserAction, logger } from "@/lib/logger";
import { performanceMonitor, startTimer } from "@/lib/performanceMonitor";
import type { MixingMasteringSubmissionInput } from "@shared/validation";
import { useCallback } from "react";

interface Service {
  id: string;
  name: string;
  price: number;
}

interface UseReservationSubmitProps {
  clerkUser: import("@clerk/types").UserResource | null | undefined;
  clerkLoaded: boolean;
  isSignedIn: boolean | undefined;
  selectedServiceData: Service | undefined;
  uploadedFiles: File[];
  fileUploadErrors: string[];
  submitForm: (url: string, data: unknown) => Promise<unknown>;
  toast: (options: { title: string; description: string; variant?: string }) => void;
  setLocation: (path: string) => void;
}

const convertTimeSlotTo24Hour = (timeSlot: string): string => {
  if (!timeSlot) return "09:00";

  const timeMap: Record<string, string> = {
    "9:00 AM": "09:00",
    "10:00 AM": "10:00",
    "11:00 AM": "11:00",
    "1:00 PM": "13:00",
    "2:00 PM": "14:00",
    "3:00 PM": "15:00",
    "4:00 PM": "16:00",
  };

  return timeMap[timeSlot] || "09:00";
};

export function useReservationSubmit({
  clerkUser,
  clerkLoaded,
  isSignedIn,
  selectedServiceData,
  uploadedFiles,
  fileUploadErrors,
  submitForm,
  toast,
  setLocation,
}: UseReservationSubmitProps) {
  return useCallback(
    async (validatedData: MixingMasteringSubmissionInput) => {
      const submissionTimer = startTimer("form_submission");

      try {
        logger.logInfo("Form submission started", {
          component: "mixing_mastering",
          action: "form_submission_start",
          userId: clerkUser?.id,
          selectedService: validatedData.selectedService,
          hasFiles: uploadedFiles.length > 0,
        });

        addBreadcrumb({
          category: "user_action",
          message: "Form submission started",
          level: "info",
          data: {
            userId: clerkUser?.id,
            selectedService: validatedData.selectedService,
            hasFiles: uploadedFiles.length > 0,
          },
        });

        if (!clerkLoaded) {
          logger.logWarning("Form submission blocked: authentication still loading", {
            component: "mixing_mastering",
            action: "form_submission_blocked",
            reason: "auth_loading",
          });

          toast({
            title: "Please Wait",
            description: "Authentication is still loading. Please try again in a moment.",
            variant: "default",
          });
          return;
        }

        if (!isSignedIn || !clerkUser) {
          logger.logWarning("Form submission blocked: user not authenticated", {
            component: "mixing_mastering",
            action: "form_submission_blocked",
            reason: "not_authenticated",
          });

          toast({
            title: "Authentication Required",
            description: "Please sign in to make a reservation.",
            variant: "destructive",
          });
          return;
        }

        const reservationData = {
          serviceType:
            validatedData.selectedService === "mixing-mastering"
              ? "mixing"
              : validatedData.selectedService,
          clientInfo: {
            firstName: validatedData.name.split(" ")[0] || validatedData.name,
            lastName: validatedData.name.split(" ").slice(1).join(" ") || "User",
            email: validatedData.email,
            phone: validatedData.phone || "0000000000",
          },
          preferredDate: new Date(
            `${validatedData.preferredDate}T${convertTimeSlotTo24Hour(validatedData.timeSlot)}`
          ).toISOString(),
          preferredDuration: 180,
          serviceDetails: {
            trackCount: Number.parseInt(validatedData.trackCount || "1", 10) || 1,
            genre: validatedData.genre || undefined,
            includeRevisions: 3,
            rushDelivery: false,
          },
          notes: (() => {
            let notes = `${validatedData.projectDetails}\n\nSpecial Requests: ${validatedData.specialRequests}\n\nReference Track: ${validatedData.reference}`;

            if (uploadedFiles.length > 0) {
              notes += `\n\nFiles Uploaded: ${uploadedFiles.map(f => f.name).join(", ")} (${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""})`;
            } else {
              notes +=
                "\n\nFiles: Client will provide files via email or cloud storage after booking confirmation.";
            }

            if (fileUploadErrors.length > 0) {
              notes += `\n\nNote: Client experienced file upload issues during booking but chose to proceed. Files can be sent separately.`;
            }

            return notes.trim();
          })(),
          budget: (selectedServiceData?.price || 0) * 100,
          acceptTerms: true,
        };

        const reservationResult = (await submitForm("/api/reservations", reservationData)) as {
          id: string;
        };

        logger.logInfo("Reservation created successfully", {
          component: "mixing_mastering",
          action: "reservation_created",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
        });

        addBreadcrumb({
          category: "api_call",
          message: "Reservation created successfully",
          level: "info",
          data: {
            userId: clerkUser.id,
            reservationId: reservationResult.id,
          },
        });

        const pendingPayment = {
          service: validatedData.selectedService,
          serviceName: selectedServiceData?.name || "Mixing & Mastering",
          serviceDetails: validatedData.projectDetails,
          reservationId: reservationResult.id,
          price: selectedServiceData?.price || 0,
          quantity: 1,
        };

        const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");
        const updatedServices = [...existingServices, pendingPayment];
        sessionStorage.setItem("pendingServices", JSON.stringify(updatedServices));

        const submissionTime = submissionTimer();

        logger.logInfo("Form submission completed successfully", {
          component: "mixing_mastering",
          action: "form_submission_success",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
          submissionTime,
        });

        performanceMonitor.recordMetric("form_submission_success", submissionTime, "ms", {
          component: "form_submission",
          userId: clerkUser.id,
        });

        toast({
          title: "Service Added!",
          description: "Your mixing & mastering service has been added to checkout.",
        });

        logUserAction("Navigating to checkout page", {
          component: "mixing_mastering",
          action: "checkout_navigation",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
        });

        setLocation("/checkout");
      } catch (error) {
        const submissionTime = submissionTimer();

        logger.logError("Form submission failed", error, {
          errorType: "api",
          component: "mixing_mastering",
          action: "form_submission_error",
          userId: clerkUser?.id,
          submissionTime,
        });

        addBreadcrumb({
          category: "error",
          message: "Form submission failed",
          level: "error",
          data: {
            userId: clerkUser?.id,
            submissionTime,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        performanceMonitor.recordMetric("form_submission_error", submissionTime, "ms", {
          component: "form_submission",
          userId: clerkUser?.id,
        });
      }
    },
    [
      clerkUser,
      clerkLoaded,
      isSignedIn,
      selectedServiceData,
      uploadedFiles,
      fileUploadErrors,
      submitForm,
      toast,
      setLocation,
    ]
  );
}
