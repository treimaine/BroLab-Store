import { addBreadcrumb } from "@/lib/errorTracker";
import { logger } from "@/lib/logger";
import { performanceMonitor, startTimer } from "@/lib/performanceMonitor";
import { useEffect } from "react";

interface FormData {
  name: string;
  email: string;
  phone: string;
}

interface UseFormAutoFillProps {
  isAuthLoading: boolean;
  isAuthenticated: boolean;
  clerkUser: import("@clerk/types").UserResource | null | undefined;
  currentFormData: FormData;
  setFormData: (data: Partial<FormData>) => void;
  handleApiError: (error: Error, context?: string) => void;
}

export function useFormAutoFill({
  isAuthLoading,
  isAuthenticated,
  clerkUser,
  currentFormData,
  setFormData,
  handleApiError,
}: UseFormAutoFillProps) {
  useEffect(() => {
    if (!isAuthLoading && isAuthenticated && clerkUser) {
      const autoFillTimer = startTimer("form_auto_fill");

      try {
        const autoFillData = {
          name: clerkUser.fullName ?? "",
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? "",
        };

        const fieldsToUpdate = {
          name: currentFormData.name || autoFillData.name,
          email: currentFormData.email || autoFillData.email,
          phone: currentFormData.phone || autoFillData.phone,
        };

        setFormData(fieldsToUpdate);

        const autoFillTime = autoFillTimer();

        logger.logInfo("Form auto-fill completed", {
          component: "mixing_mastering",
          action: "form_auto_fill",
          userId: clerkUser.id,
          autoFillTime,
          fieldsAutoFilled: Object.keys(fieldsToUpdate).filter(
            key =>
              fieldsToUpdate[key as keyof typeof fieldsToUpdate] &&
              !currentFormData[key as keyof typeof currentFormData]
          ),
        });

        addBreadcrumb({
          category: "state_change",
          message: "Form auto-fill completed",
          level: "info",
          data: {
            userId: clerkUser.id,
            autoFillTime,
          },
        });

        performanceMonitor.recordMetric("form_auto_fill_time", autoFillTime, "ms", {
          component: "form_auto_fill",
          userId: clerkUser.id,
        });
      } catch (error) {
        const autoFillTime = autoFillTimer();

        logger.logError("Form auto-fill failed", error, {
          errorType: "validation",
          component: "mixing_mastering",
          action: "form_auto_fill_error",
          userId: clerkUser?.id,
          autoFillTime,
        });

        handleApiError(error instanceof Error ? error : new Error(String(error)), "auto-fill");
      }
    }
  }, [isAuthLoading, isAuthenticated, clerkUser, handleApiError, setFormData, currentFormData]);
}
