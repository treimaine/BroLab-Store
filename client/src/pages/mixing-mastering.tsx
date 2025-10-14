import { SafeMixingMasteringErrorBoundary } from "@/components/SafeMixingMasteringErrorBoundary";
import { StandardHero } from "@/components/ui/StandardHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useFormSubmissionWithRetry } from "@/hooks/useApiWithRetry";
import { useFormValidation } from "@/hooks/useFormValidation";
import { api } from "@/lib/convex";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import {
  logAuthError,
  logAuthEvent,
  logFileUpload,
  logFileUploadError,
  logUserAction,
  logger,
} from "@/lib/logger";
import {
  performanceMonitor,
  startTimer,
  trackComponentPerformance,
  trackUserInteraction,
} from "@/lib/performanceMonitor";
import { useAuth, useUser } from "@clerk/clerk-react";
import {
  mixingMasteringSubmissionSchema,
  type MixingMasteringSubmissionInput,
} from "@shared/validation";
import { useQuery } from "convex/react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Clock,
  Info,
  Loader2,
  Mail,
  Phone,
  Star,
  User,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";
import FileUpload from "../../../components/kokonutui/file-upload";

const services = [
  {
    id: "mixing",
    name: "Professional Mixing",
    price: 70,
    duration: "3-5 business days",
    description: "Professional mixing with EQ, compression, effects, and spatial processing",
    features: [
      "Professional EQ and compression",
      "Spatial processing and effects",
      "Stereo width enhancement",
      "Dynamic range optimization",
      "Up to 3 revisions included",
      "Stems delivery available",
    ],
  },
  {
    id: "mastering",
    name: "Audio Mastering",
    price: 50,
    duration: "1-2 business days",
    description: "Professional mastering for streaming platforms and distribution",
    features: [
      "Loudness optimization",
      "Frequency balance correction",
      "Streaming platform compliance",
      "Multiple format delivery",
      "Reference track matching",
      "Quality assurance check",
    ],
  },
  {
    id: "mixing-mastering",
    name: "Mixing + Mastering",
    price: 150,
    duration: "4-6 business days",
    description: "Complete mixing and mastering package for your track",
    features: [
      "Everything in mixing package",
      "Everything in mastering package",
      "Seamless workflow integration",
      "Priority turnaround time",
      "Extended revision period",
      "Bonus stems package",
    ],
  },
];

const timeSlots = ["9:00 AM", "10:00 AM", "11:00 AM", "1:00 PM", "2:00 PM", "3:00 PM", "4:00 PM"];

// Helper function to convert time slot to 24-hour format
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

function MixingMasteringContent() {
  const componentMountTimer = startTimer("mixing_mastering_component_mount");
  const [, setLocation] = useLocation();
  const { user: clerkUser, isLoaded: clerkLoaded, isSignedIn } = useUser();
  const { getToken } = useAuth();

  // Log component mount
  useEffect(() => {
    const mountTime = componentMountTimer();
    trackComponentPerformance("MixingMasteringContent", mountTime, true);

    logger.logInfo("MixingMasteringContent component mounted", {
      component: "mixing_mastering",
      action: "component_mount",
      mountTime,
    });

    // Add breadcrumb for page load
    addBreadcrumb({
      category: "navigation",
      message: "Mixing & Mastering page loaded",
      level: "info",
      data: {
        url: window.location.href,
        mountTime,
      },
    });

    return () => {
      logger.logInfo("MixingMasteringContent component unmounting", {
        component: "mixing_mastering",
        action: "component_unmount",
      });
    };
  }, [componentMountTimer]);

  // Authentication state management - non-blocking approach
  const [authState, setAuthState] = useState({
    isLoading: !clerkLoaded,
    hasError: false,
    errorMessage: null as string | null,
    isAuthenticated: false,
  });

  // Update auth state when Clerk loads
  useEffect(() => {
    if (clerkLoaded) {
      const authLoadTimer = startTimer("auth_state_update");

      const newAuthState = {
        isLoading: false,
        isAuthenticated: !!isSignedIn && !!clerkUser,
        hasError: false,
        errorMessage: null,
      };

      setAuthState(prev => ({
        ...prev,
        ...newAuthState,
      }));

      const authLoadTime = authLoadTimer();

      // Log authentication state change
      logAuthEvent(
        `Authentication loaded: ${newAuthState.isAuthenticated ? "authenticated" : "unauthenticated"}`,
        {
          component: "mixing_mastering",
          action: "auth_state_loaded",
          isAuthenticated: newAuthState.isAuthenticated,
          userId: clerkUser?.id,
          authLoadTime,
        }
      );

      // Add breadcrumb for auth state
      addBreadcrumb({
        category: "state_change",
        message: `Authentication state loaded: ${newAuthState.isAuthenticated ? "authenticated" : "unauthenticated"}`,
        level: "info",
        data: {
          isAuthenticated: newAuthState.isAuthenticated,
          userId: clerkUser?.id,
          authLoadTime,
        },
      });

      // Track auth performance
      performanceMonitor.recordMetric("auth_load_time", authLoadTime, "ms", {
        component: "authentication",
        isAuthenticated: newAuthState.isAuthenticated,
      });
    }
  }, [clerkLoaded, isSignedIn, clerkUser]);

  // Enhanced error handler that doesn't block page rendering
  const handleApiError = useCallback((error: Error, context?: string) => {
    // Track the error with comprehensive context
    const errorId = errorTracker.trackError(error, {
      errorType: context === "authentication" ? "authentication" : "api",
      component: "mixing_mastering",
      action: "api_error_handler",
      page: "mixing-mastering",
      errorCode: error.message.includes("401") ? 401 : undefined,
      recoverable: true,
      context: context || "unknown",
    });

    // Log the error appropriately
    if (context === "authentication") {
      logAuthError(`Authentication error in ${context}`, error, {
        component: "mixing_mastering",
        action: "auth_error_handler",
        errorId,
      });
    } else {
      logger.logError(`API error in ${context}`, error, {
        errorType: "api",
        component: "mixing_mastering",
        action: "api_error_handler",
        errorId,
        context: context || "unknown",
      });
    }

    // Don't set auth error state for non-auth errors
    if (context !== "authentication") {
      return;
    }

    // Only set auth error for actual authentication failures
    if (error.message.includes("401") || error.message.includes("authentication")) {
      setAuthState(prev => ({
        ...prev,
        hasError: true,
        errorMessage: "Authentication temporarily unavailable. You can still browse services.",
      }));

      // Add breadcrumb for auth error
      addBreadcrumb({
        category: "error",
        message: "Authentication error occurred",
        level: "error",
        data: {
          errorMessage: error.message,
          errorId,
          context,
        },
      });
    }
  }, []);

  // Safely query user data with error handling - non-blocking
  const convexUser = useQuery(
    api.users.getUserByClerkId,
    clerkUser && !authState.hasError ? { clerkId: clerkUser.id } : "skip"
  );

  const [selectedService, setSelectedService] = useState("mixing-mastering");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUploadErrors, setFileUploadErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Initialize form validation with enhanced schema
  const initialFormData = {
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    timeSlot: "",
    projectDetails: "",
    trackCount: "",
    genre: "",
    reference: "",
    specialRequests: "",
    selectedService: selectedService as "mixing" | "mastering" | "mixing-mastering",
  };

  const {
    data: formData,
    errors: formErrors,
    isValid: isFormValid,
    isValidating,
    hasBeenSubmitted,
    updateField,
    handleBlur,
    handleSubmit: createSubmitHandler,
    setData: setFormData,
    getFieldError,
    isFieldValid: _isFieldValid,
  } = useFormValidation({
    schema: mixingMasteringSubmissionSchema,
    initialData: initialFormData,
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 500,
  });

  // Enhanced API submission with retry mechanism
  const {
    isLoading: isSubmitting,
    error: _submissionError,
    retryCount,
    submitForm,
  } = useFormSubmissionWithRetry({
    retries: 3,
    retryDelay: 1000,
    showToastOnError: true,
    showToastOnRetry: true,
    customErrorMessages: {
      401: "Please sign in to make a reservation.",
      422: "Please check your form data and try again.",
      429: "Too many requests. Please wait a moment before trying again.",
    },
    getAuthToken: getToken,
  });

  // Auto-scroll to top when page loads
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // Auto-fill form data when user data is available - with proper error handling
  useEffect(() => {
    // Only auto-fill if authentication is loaded and successful
    if (!authState.isLoading && authState.isAuthenticated && clerkUser) {
      const autoFillTimer = startTimer("form_auto_fill");

      try {
        const autoFillData = {
          name: clerkUser.fullName ?? "",
          email: clerkUser.emailAddresses[0]?.emailAddress ?? "",
          phone: clerkUser.phoneNumbers?.[0]?.phoneNumber ?? "",
        };

        // If convexUser is available, use that data too (with fallback)
        if (convexUser) {
          const convexName =
            convexUser.firstName && convexUser.lastName
              ? `${convexUser.firstName} ${convexUser.lastName}`.trim()
              : "";

          autoFillData.name = convexName || autoFillData.name;
          autoFillData.email = convexUser.email || autoFillData.email;
        }

        // Only update fields that are currently empty to avoid overwriting user input
        const fieldsToUpdate = {
          name: formData.name || autoFillData.name,
          email: formData.email || autoFillData.email,
          phone: formData.phone || autoFillData.phone,
        };

        setFormData(fieldsToUpdate);

        const autoFillTime = autoFillTimer();

        // Log successful auto-fill
        logger.logInfo("Form auto-fill completed", {
          component: "mixing_mastering",
          action: "form_auto_fill",
          userId: clerkUser.id,
          autoFillTime,
          fieldsAutoFilled: Object.keys(fieldsToUpdate).filter(
            key =>
              fieldsToUpdate[key as keyof typeof fieldsToUpdate] &&
              !formData[key as keyof typeof formData]
          ),
        });

        // Add breadcrumb for auto-fill
        addBreadcrumb({
          category: "state_change",
          message: "Form auto-fill completed",
          level: "info",
          data: {
            userId: clerkUser.id,
            autoFillTime,
            fieldsAutoFilled: Object.keys(fieldsToUpdate).filter(
              key =>
                fieldsToUpdate[key as keyof typeof fieldsToUpdate] &&
                !formData[key as keyof typeof formData]
            ),
          },
        });

        // Track auto-fill performance
        performanceMonitor.recordMetric("form_auto_fill_time", autoFillTime, "ms", {
          component: "form_auto_fill",
          userId: clerkUser.id,
        });
      } catch (error) {
        const autoFillTime = autoFillTimer();

        // Log auto-fill error
        logger.logError("Form auto-fill failed", error, {
          errorType: "validation",
          component: "mixing_mastering",
          action: "form_auto_fill_error",
          userId: clerkUser?.id,
          autoFillTime,
        });

        handleApiError(error instanceof Error ? error : new Error(String(error)), "auto-fill");
        // Don't block page rendering - auto-fill is optional
      }
    }
  }, [
    authState.isLoading,
    authState.isAuthenticated,
    clerkUser,
    convexUser,
    handleApiError,
    setFormData,
    formData.name,
    formData.email,
    formData.phone,
    formData,
  ]);

  // Update selected service in form data when service selection changes
  useEffect(() => {
    updateField("selectedService", selectedService);
  }, [selectedService, updateField]);

  const selectedServiceData = services.find(s => s.id === selectedService);

  const handleInputChange = (field: keyof MixingMasteringSubmissionInput, value: string) => {
    // Log form field changes for debugging
    logUserAction(`Form field changed: ${field}`, {
      component: "mixing_mastering",
      action: "form_field_change",
      field,
      valueLength: value.length,
    });

    // Track user interaction
    trackUserInteraction("form_field_change", field, undefined, {
      field,
      valueLength: value.length,
    });

    updateField(field, value);
  };

  const handleFileRemove = (index: number) => {
    const fileToRemove = uploadedFiles[index];

    // Log file removal
    logFileUpload("File removed by user", fileToRemove?.name, {
      component: "mixing_mastering",
      action: "file_remove",
      fileIndex: index,
      totalFiles: uploadedFiles.length,
    });

    // Track user interaction
    trackUserInteraction("file_remove", "remove_button", undefined, {
      fileName: fileToRemove?.name,
      fileIndex: index,
      totalFiles: uploadedFiles.length,
    });

    // Add breadcrumb for file removal
    addBreadcrumb({
      category: "user_action",
      message: `File removed: ${fileToRemove?.name || "unknown"}`,
      level: "info",
      data: {
        fileName: fileToRemove?.name,
        fileIndex: index,
        totalFiles: uploadedFiles.length,
      },
    });

    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  const handleSubmit = createSubmitHandler(
    async (validatedData: MixingMasteringSubmissionInput) => {
      const submissionTimer = startTimer("form_submission");

      try {
        // Log form submission start
        logger.logInfo("Form submission started", {
          component: "mixing_mastering",
          action: "form_submission_start",
          userId: clerkUser?.id,
          selectedService,
          hasFiles: uploadedFiles.length > 0,
          formDataKeys: Object.keys(validatedData),
        });

        // Add breadcrumb for form submission
        addBreadcrumb({
          category: "user_action",
          message: "Form submission started",
          level: "info",
          data: {
            userId: clerkUser?.id,
            selectedService,
            hasFiles: uploadedFiles.length > 0,
            formDataKeys: Object.keys(validatedData),
          },
        });

        // Check authentication status - non-blocking approach
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
            isSignedIn,
            hasClerkUser: !!clerkUser,
          });

          toast({
            title: "Authentication Required",
            description: "Please sign in to make a reservation.",
            variant: "destructive",
          });
          return;
        }

        logger.logInfo("Form submission proceeding with authenticated user", {
          component: "mixing_mastering",
          action: "form_submission_proceeding",
          userId: clerkUser.id,
          userName: clerkUser.fullName,
        });

        // Create reservation with correct schema format
        const reservationData = {
          serviceType:
            validatedData.selectedService === "mixing-mastering"
              ? "mixing"
              : (validatedData.selectedService as "mixing" | "mastering"),
          clientInfo: {
            firstName: validatedData.name.split(" ")[0] || validatedData.name,
            lastName: validatedData.name.split(" ").slice(1).join(" ") || "User",
            email: validatedData.email,
            phone: (validatedData.phone as string) || "0000000000", // Provide default phone if empty
          },
          preferredDate: new Date(
            `${validatedData.preferredDate}T${convertTimeSlotTo24Hour(validatedData.timeSlot)}`
          ).toISOString(),
          preferredDuration: 180, // 3 hours default for mixing/mastering
          serviceDetails: {
            trackCount: parseInt(validatedData.trackCount || "1") || 1,
            genre: validatedData.genre || undefined,
            includeRevisions: 3,
            rushDelivery: false,
          },
          notes: (() => {
            let notes = `${validatedData.projectDetails}\n\nSpecial Requests: ${validatedData.specialRequests}\n\nReference Track: ${validatedData.reference}`;

            // Add file upload status to notes for better service delivery
            if (uploadedFiles.length > 0) {
              notes += `\n\nFiles Uploaded: ${uploadedFiles.map(f => f.name).join(", ")} (${uploadedFiles.length} file${uploadedFiles.length > 1 ? "s" : ""})`;
            } else {
              notes +=
                "\n\nFiles: Client will provide files via email or cloud storage after booking confirmation.";
            }

            // Add file upload error context if any occurred
            if (fileUploadErrors.length > 0) {
              notes += `\n\nNote: Client experienced file upload issues during booking but chose to proceed. Files can be sent separately.`;
            }

            return notes.trim();
          })(),
          budget: (selectedServiceData?.price || 0) * 100, // Convert to cents
          acceptTerms: true,
        };

        logger.logInfo("Sending reservation data to API", {
          component: "mixing_mastering",
          action: "reservation_api_call",
          userId: clerkUser.id,
          serviceType: reservationData.serviceType,
          budget: reservationData.budget,
          hasNotes: !!reservationData.notes,
        });

        // Submit reservation using enhanced API with retry
        const reservationResult = (await submitForm("/api/reservations", reservationData)) as {
          id: string;
        };

        logger.logInfo("Reservation created successfully", {
          component: "mixing_mastering",
          action: "reservation_created",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
        });

        // Add breadcrumb for successful reservation
        addBreadcrumb({
          category: "api_call",
          message: "Reservation created successfully",
          level: "info",
          data: {
            userId: clerkUser.id,
            reservationId: reservationResult.id,
            serviceType: reservationData.serviceType,
          },
        });

        // Create payment intent for the service with enhanced metadata
        logger.logInfo("Creating payment intent", {
          component: "mixing_mastering",
          action: "payment_intent_creation",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
          amount: selectedServiceData?.price || 0,
        });

        const paymentIntentData = {
          amount: selectedServiceData?.price || 0,
          currency: "usd",
          metadata: {
            type: "service_reservation",
            reservationId: reservationResult.id,
            service: selectedService,
            serviceName: selectedServiceData?.name || "Mixing & Mastering",
            customerName: validatedData.name,
            customerEmail: validatedData.email,
            userId: clerkUser.id,
            trackCount: validatedData.trackCount || "1",
            genre: validatedData.genre || "Unknown",
            preferredDate: validatedData.preferredDate,
            timeSlot: validatedData.timeSlot,
          },
        };

        const paymentData = (await submitForm(
          "/api/payment/stripe/create-payment-intent",
          paymentIntentData
        )) as {
          clientSecret: string;
          paymentIntentId: string;
        };

        logger.logInfo("Payment intent created successfully", {
          component: "mixing_mastering",
          action: "payment_intent_created",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
          paymentIntentId: paymentData.paymentIntentId,
          hasClientSecret: !!paymentData.clientSecret,
        });

        // Store payment info in enhanced multi-services format
        const pendingPayment = {
          clientSecret: paymentData.clientSecret,
          paymentIntentId: paymentData.paymentIntentId,
          service: selectedService,
          serviceName: selectedServiceData?.name || "Mixing & Mastering",
          serviceDetails: validatedData.projectDetails,
          price: selectedServiceData?.price || 0,
          quantity: 1,
          reservationId: reservationResult.id,
          metadata: {
            trackCount: validatedData.trackCount || "1",
            genre: validatedData.genre || "Unknown",
            preferredDate: validatedData.preferredDate,
            timeSlot: validatedData.timeSlot,
            customerName: validatedData.name,
            customerEmail: validatedData.email,
          },
          createdAt: new Date().toISOString(),
        };

        // Enhanced session storage management
        try {
          const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");

          // Remove any existing service with the same reservation ID to avoid duplicates
          const filteredServices = existingServices.filter(
            (service: any) => service.reservationId !== reservationResult.id
          );

          const updatedServices = [...filteredServices, pendingPayment];
          sessionStorage.setItem("pendingServices", JSON.stringify(updatedServices));

          // Also store a backup in case of session storage issues
          sessionStorage.setItem("lastReservationPayment", JSON.stringify(pendingPayment));

          logger.logInfo("Session storage updated successfully", {
            component: "mixing_mastering",
            action: "session_storage_update",
            userId: clerkUser.id,
            reservationId: reservationResult.id,
            totalServices: updatedServices.length,
          });
        } catch (storageError) {
          logger.logError("Failed to update session storage", storageError, {
            errorType: "api",
            component: "mixing_mastering",
            action: "session_storage_error",
            userId: clerkUser.id,
            reservationId: reservationResult.id,
          });

          // Continue with checkout even if session storage fails
          toast({
            title: "Warning",
            description: "Payment info may not persist. Please complete checkout immediately.",
            variant: "default",
          });
        }

        const submissionTime = submissionTimer();

        // Log successful form submission
        logger.logInfo("Form submission completed successfully", {
          component: "mixing_mastering",
          action: "form_submission_success",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
          submissionTime,
          selectedService,
          totalPrice: selectedServiceData?.price || 0,
        });

        // Add success breadcrumb
        addBreadcrumb({
          category: "user_action",
          message: "Form submission completed successfully",
          level: "info",
          data: {
            userId: clerkUser.id,
            reservationId: reservationResult.id,
            submissionTime,
            selectedService,
          },
        });

        // Track successful submission performance
        performanceMonitor.recordMetric("form_submission_success", submissionTime, "ms", {
          component: "form_submission",
          userId: clerkUser.id,
          selectedService,
        });

        toast({
          title: "Service Added!",
          description: "Your mixing & mastering service has been added to checkout.",
        });

        // Log navigation to checkout
        logUserAction("Navigating to checkout page", {
          component: "mixing_mastering",
          action: "checkout_navigation",
          userId: clerkUser.id,
          reservationId: reservationResult.id,
        });

        setLocation("/checkout");
      } catch (error) {
        const submissionTime = submissionTimer();

        // Log form submission error
        logger.logError("Form submission failed", error, {
          errorType: "api",
          component: "mixing_mastering",
          action: "form_submission_error",
          userId: clerkUser?.id,
          submissionTime,
          selectedService,
          hasFiles: uploadedFiles.length > 0,
        });

        // Add error breadcrumb
        addBreadcrumb({
          category: "error",
          message: "Form submission failed",
          level: "error",
          data: {
            userId: clerkUser?.id,
            submissionTime,
            selectedService,
            errorMessage: error instanceof Error ? error.message : String(error),
          },
        });

        // Track failed submission performance
        performanceMonitor.recordMetric("form_submission_error", submissionTime, "ms", {
          component: "form_submission",
          userId: clerkUser?.id,
          selectedService,
          errorType: error instanceof Error ? error.name : "unknown",
        });

        // Error handling is managed by the useFormSubmissionWithRetry hook
      }
    }
  );

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Mixing & Mastering"
        subtitle="Professional audio engineering services to make your music sound radio-ready. Get professional mixing and mastering from industry experts."
      />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Enhanced Authentication Loading State */}
        {authState.isLoading && (
          <div className="mb-8 p-4 bg-gradient-to-r from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-center text-blue-300">
              <Loader2 className="animate-spin h-5 w-5 mr-3" />
              <div className="text-center">
                <p className="font-medium">Loading authentication...</p>
                <p className="text-xs text-blue-400 mt-1">Preparing your personalized experience</p>
              </div>
            </div>
          </div>
        )}

        {/* Form Validation Status */}
        {hasBeenSubmitted && !isFormValid && (
          <div className="mb-8 p-4 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center text-red-300">
              <AlertTriangle className="w-5 h-5 mr-2" />
              <div>
                <p className="font-medium">Please fix the following errors:</p>
                <ul className="mt-2 text-sm list-disc list-inside">
                  {Object.entries(formErrors).map(([field, error]) =>
                    error ? (
                      <li key={field}>
                        {field.charAt(0).toUpperCase() + field.slice(1)}: {error}
                      </li>
                    ) : null
                  )}
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* Retry Status */}
        {retryCount > 0 && (
          <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center text-yellow-300">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p>Retrying request... (Attempt {retryCount} of 3)</p>
            </div>
          </div>
        )}

        {/* Enhanced User Status Indicator with helpful tips */}
        {!authState.isLoading && !authState.isAuthenticated && !authState.hasError && (
          <div className="mb-8 p-6 bg-gradient-to-r from-blue-900/20 to-indigo-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                <Info className="w-6 h-6 text-blue-400" />
              </div>
              <div className="flex-1">
                <h3 className="text-blue-300 font-semibold mb-2">Quick Start Tips</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2 text-blue-200">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <span>
                      <strong>Sign in</strong> to auto-fill your contact information and track
                      orders
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-200">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <span>
                      <strong>No account needed</strong> to browse services and get quotes
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-200">
                    <ArrowRight className="w-4 h-4 text-purple-400" />
                    <span>
                      <strong>Fast checkout</strong> - complete your booking in under 2 minutes
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Authentication Error Notice - non-blocking */}
        {authState.hasError && (
          <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <div className="flex items-center justify-center text-yellow-300">
              <AlertCircle className="w-5 h-5 mr-2" />
              <p className="text-center">
                <strong>Authentication Notice:</strong>{" "}
                {authState.errorMessage ||
                  "Authentication is temporarily unavailable, but you can still browse our services."}
              </p>
            </div>
          </div>
        )}

        {/* Progress Indicator */}
        <div className="mb-8 max-w-4xl mx-auto">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--accent-purple)] text-white rounded-full flex items-center justify-center font-semibold">
                <CheckCircle className="w-5 h-5" />
              </div>
              <span className="text-white font-medium">Choose Service</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-600 mx-4">
              <div className="h-full bg-[var(--accent-purple)] w-full transition-all duration-500" />
            </div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-[var(--accent-purple)] text-white rounded-full flex items-center justify-center font-semibold">
                2
              </div>
              <span className="text-white font-medium">Book Session</span>
            </div>
            <div className="flex-1 h-0.5 bg-gray-600 mx-4" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center font-semibold">
                3
              </div>
              <span className="text-gray-400">Checkout</span>
            </div>
          </div>
          <div className="mt-3 text-center">
            <p className="text-sm text-gray-400">
              Selected:{" "}
              <span className="text-[var(--accent-purple)] font-medium">
                {selectedServiceData?.name}
              </span>{" "}
              -<span className="text-white font-medium"> ${selectedServiceData?.price}</span>
            </p>
          </div>
        </div>

        {/* Service Selection Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-2">Choose Your Service</h2>
          <p className="text-gray-300 max-w-2xl mx-auto">
            Select the perfect audio engineering service for your project. All services include
            professional quality and fast turnaround.
          </p>
        </div>

        {/* Services Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
          {services.map(service => (
            <Card
              key={service.id}
              className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl relative ${
                selectedService === service.id
                  ? "card-dark ring-2 ring-[var(--accent-purple)] shadow-lg shadow-purple-500/20"
                  : "card-dark hover:ring-1 hover:ring-gray-500/50"
              }`}
              onClick={() => {
                // Log service selection
                logUserAction(`Service selected: ${service.name}`, {
                  component: "mixing_mastering",
                  action: "service_selection",
                  serviceId: service.id,
                  serviceName: service.name,
                  servicePrice: service.price,
                  previousService: selectedService,
                });

                // Track user interaction
                trackUserInteraction("service_selection", "service_card", undefined, {
                  serviceId: service.id,
                  serviceName: service.name,
                  servicePrice: service.price,
                  previousService: selectedService,
                });

                // Add breadcrumb for service selection
                addBreadcrumb({
                  category: "user_action",
                  message: `Service selected: ${service.name}`,
                  level: "info",
                  data: {
                    serviceId: service.id,
                    serviceName: service.name,
                    servicePrice: service.price,
                    previousService: selectedService,
                  },
                });

                setSelectedService(service.id);
              }}
            >
              {selectedService === service.id && (
                <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent-purple)] rounded-full flex items-center justify-center">
                  <CheckCircle className="w-4 h-4 text-white" />
                </div>
              )}
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="text-xl text-white flex items-center gap-2">
                    {service.name}
                    {service.id === "mixing-mastering" && (
                      <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                        Best Value
                      </Badge>
                    )}
                  </CardTitle>
                  <Badge className="bg-[var(--accent-purple)] text-white font-semibold">
                    ${service.price}
                  </Badge>
                </div>
                <div className="flex items-center text-gray-400 text-sm">
                  <Clock className="w-4 h-4 mr-1" />
                  {service.duration}
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-gray-300 mb-4">{service.description}</p>
                <ul className="space-y-2">
                  {service.features.map(feature => (
                    <li key={feature} className="flex items-center text-sm text-gray-300">
                      <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Booking Form */}
        <Card className="max-w-4xl mx-auto card-dark">
          <CardHeader>
            <CardTitle className="text-2xl text-white text-center">Reserve Your Session</CardTitle>
            <p className="text-center text-gray-300">
              Selected: {selectedServiceData?.name} - ${selectedServiceData?.price}
            </p>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Personal Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label className="text-white flex items-center gap-2">
                    Full Name *
                    {authState.isLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    )}
                    {authState.isAuthenticated && formData.name && !authState.isLoading && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 text-xs">Auto-filled</span>
                      </div>
                    )}
                  </Label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    {authState.isLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin" />
                    )}
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={e => handleInputChange("name", e.target.value)}
                      onBlur={() => handleBlur("name")}
                      className={`pl-10 ${authState.isLoading ? "pr-10" : ""} bg-[var(--medium-gray)] border-gray-600 text-white ${
                        getFieldError("name") ? "border-red-500" : ""
                      } ${authState.isAuthenticated && formData.name && !getFieldError("name") ? "border-green-500/50 bg-green-900/10" : ""}`}
                      placeholder={
                        authState.isLoading
                          ? "Loading your information..."
                          : authState.isAuthenticated
                            ? "Your name will be auto-filled"
                            : "Enter your full name"
                      }
                      disabled={authState.isLoading || isValidating}
                    />
                  </div>
                  {getFieldError("name") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("name")}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white flex items-center gap-2">
                    Email *
                    {authState.isLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    )}
                    {authState.isAuthenticated && formData.email && !authState.isLoading && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 text-xs">Auto-filled</span>
                      </div>
                    )}
                  </Label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    {authState.isLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin" />
                    )}
                    <Input
                      type="email"
                      required
                      value={formData.email}
                      onChange={e => handleInputChange("email", e.target.value)}
                      onBlur={() => handleBlur("email")}
                      className={`pl-10 ${authState.isLoading ? "pr-10" : ""} bg-[var(--medium-gray)] border-gray-600 text-white ${
                        getFieldError("email") ? "border-red-500" : ""
                      } ${authState.isAuthenticated && formData.email && !getFieldError("email") ? "border-green-500/50 bg-green-900/10" : ""}`}
                      placeholder={
                        authState.isLoading
                          ? "Loading your email..."
                          : authState.isAuthenticated
                            ? "Your email will be auto-filled"
                            : "your@email.com"
                      }
                      disabled={authState.isLoading || isValidating}
                    />
                  </div>
                  {getFieldError("email") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("email")}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white flex items-center gap-2">
                    Phone Number
                    {authState.isLoading && (
                      <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
                    )}
                    {authState.isAuthenticated && formData.phone && !authState.isLoading && (
                      <div className="flex items-center gap-1">
                        <CheckCircle className="w-3 h-3 text-green-400" />
                        <span className="text-green-400 text-xs">Auto-filled</span>
                      </div>
                    )}
                  </Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    {authState.isLoading && (
                      <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin" />
                    )}
                    <Input
                      type="tel"
                      value={formData.phone || ""}
                      onChange={e => handleInputChange("phone", e.target.value)}
                      onBlur={() => handleBlur("phone")}
                      className={`pl-10 ${authState.isLoading ? "pr-10" : ""} bg-[var(--medium-gray)] border-gray-600 text-white ${
                        getFieldError("phone") ? "border-red-500" : ""
                      } ${authState.isAuthenticated && formData.phone && !getFieldError("phone") ? "border-green-500/50 bg-green-900/10" : ""}`}
                      placeholder={
                        authState.isLoading
                          ? "Loading your phone..."
                          : authState.isAuthenticated
                            ? "Your phone will be auto-filled"
                            : "(123) 456-7890"
                      }
                      disabled={authState.isLoading || isValidating}
                    />
                  </div>
                  {getFieldError("phone") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("phone")}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white">Preferred Date *</Label>
                  <Input
                    type="date"
                    required
                    value={formData.preferredDate}
                    onChange={e => handleInputChange("preferredDate", e.target.value)}
                    onBlur={() => handleBlur("preferredDate")}
                    className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
                      getFieldError("preferredDate") ? "border-red-500" : ""
                    }`}
                    min={new Date().toISOString().split("T")[0]}
                    disabled={isValidating}
                  />
                  {getFieldError("preferredDate") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("preferredDate")}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white">Preferred Time *</Label>
                  <Select
                    value={formData.timeSlot}
                    onValueChange={value => handleInputChange("timeSlot", value)}
                    disabled={isValidating}
                  >
                    <SelectTrigger
                      className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
                        getFieldError("timeSlot") ? "border-red-500" : ""
                      }`}
                    >
                      <SelectValue placeholder="Select a time slot" />
                    </SelectTrigger>
                    <SelectContent>
                      {timeSlots.map(slot => (
                        <SelectItem key={slot} value={slot}>
                          {slot}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {getFieldError("timeSlot") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("timeSlot")}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white">Number of Tracks</Label>
                  <Input
                    type="number"
                    value={formData.trackCount || ""}
                    onChange={e => handleInputChange("trackCount", e.target.value)}
                    onBlur={() => handleBlur("trackCount")}
                    className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
                      getFieldError("trackCount") ? "border-red-500" : ""
                    }`}
                    placeholder="e.g., 1"
                    min="1"
                    max="100"
                    disabled={isValidating}
                  />
                  {getFieldError("trackCount") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("trackCount")}</p>
                  )}
                </div>

                <div>
                  <Label className="text-white">Genre</Label>
                  <Select
                    value={formData.genre || ""}
                    onValueChange={value => handleInputChange("genre", value)}
                    disabled={isValidating}
                  >
                    <SelectTrigger className="bg-[var(--medium-gray)] border-gray-600 text-white">
                      <SelectValue placeholder="Select genre" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hip-hop">Hip Hop</SelectItem>
                      <SelectItem value="trap">Trap</SelectItem>
                      <SelectItem value="r&b">R&B</SelectItem>
                      <SelectItem value="afrobeat">Afrobeat</SelectItem>
                      <SelectItem value="pop">Pop</SelectItem>
                      <SelectItem value="rock">Rock</SelectItem>
                      <SelectItem value="electronic">Electronic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label className="text-white">Reference Track (Optional)</Label>
                  <Input
                    type="text"
                    value={formData.reference || ""}
                    onChange={e => handleInputChange("reference", e.target.value)}
                    onBlur={() => handleBlur("reference")}
                    className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
                      getFieldError("reference") ? "border-red-500" : ""
                    }`}
                    placeholder="Link to reference track"
                    disabled={isValidating}
                  />
                  {getFieldError("reference") && (
                    <p className="text-red-400 text-sm mt-1">{getFieldError("reference")}</p>
                  )}
                </div>
              </div>

              {/* Project Details */}
              <div>
                <Label className="text-white">Project Details *</Label>
                <Textarea
                  required
                  value={formData.projectDetails}
                  onChange={e => handleInputChange("projectDetails", e.target.value)}
                  onBlur={() => handleBlur("projectDetails")}
                  className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
                    getFieldError("projectDetails") ? "border-red-500" : ""
                  }`}
                  placeholder="Tell us about your project, what you're looking for, and any specific requirements... (minimum 20 characters)"
                  rows={4}
                  disabled={isValidating}
                />
                {getFieldError("projectDetails") && (
                  <p className="text-red-400 text-sm mt-1">{getFieldError("projectDetails")}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {formData.projectDetails.length}/2000 characters
                </p>
              </div>

              {/* Special Requests */}
              <div>
                <Label className="text-white">Special Requests</Label>
                <Textarea
                  value={formData.specialRequests || ""}
                  onChange={e => handleInputChange("specialRequests", e.target.value)}
                  onBlur={() => handleBlur("specialRequests")}
                  className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
                    getFieldError("specialRequests") ? "border-red-500" : ""
                  }`}
                  placeholder="Any special requests or additional notes..."
                  rows={3}
                  disabled={isValidating}
                />
                {getFieldError("specialRequests") && (
                  <p className="text-red-400 text-sm mt-1">{getFieldError("specialRequests")}</p>
                )}
                <p className="text-gray-500 text-xs mt-1">
                  {(formData.specialRequests || "").length}/1000 characters
                </p>
              </div>

              {/* File Upload Section */}
              <div className="space-y-3">
                <Label className="text-white">Upload Project Files (Optional)</Label>
                <div className="flex justify-center">
                  <FileUpload
                    onUploadSuccess={(file: File) => {
                      setUploadedFiles(prev => [...prev, file]);

                      // Log successful file upload
                      logFileUpload("File uploaded successfully", file.name, {
                        component: "mixing_mastering",
                        action: "file_upload_success",
                        fileSize: file.size,
                        fileType: file.type,
                        totalFiles: uploadedFiles.length + 1,
                      });

                      // Add breadcrumb for successful upload
                      addBreadcrumb({
                        category: "user_action",
                        message: `File uploaded successfully: ${file.name}`,
                        level: "info",
                        data: {
                          fileName: file.name,
                          fileSize: file.size,
                          fileType: file.type,
                          totalFiles: uploadedFiles.length + 1,
                        },
                      });

                      // Track file upload performance
                      performanceMonitor.recordMetric("file_upload_success", file.size, "bytes", {
                        component: "file_upload",
                        fileName: file.name,
                        fileType: file.type,
                      });

                      toast({
                        title: "File Uploaded Successfully",
                        description: `${file.name} has been uploaded and will be included with your reservation.`,
                        variant: "default",
                      });
                    }}
                    onUploadError={error => {
                      // Enhanced file upload error handling - graceful degradation

                      // Log file upload error with comprehensive context
                      logFileUploadError("File upload failed", error, {
                        component: "mixing_mastering",
                        action: "file_upload_error",
                        errorCode: error.code,
                        severity: error.severity,
                        recoverable: error.recoverable,
                        formCanStillSubmit: true,
                      });

                      // Track the error
                      const errorId = errorTracker.trackError(error, {
                        errorType: "file_upload",
                        component: "mixing_mastering",
                        action: "file_upload_failed",
                        errorCode: error.code,
                        recoverable: error.recoverable || true,
                        severity: error.severity,
                      });

                      // Add error breadcrumb
                      addBreadcrumb({
                        category: "error",
                        message: `File upload failed: ${error.message}`,
                        level: error.severity === "warning" ? "warning" : "error",
                        data: {
                          errorCode: error.code,
                          errorMessage: error.message,
                          severity: error.severity,
                          recoverable: error.recoverable,
                          errorId,
                        },
                      });

                      // Track file upload error performance
                      performanceMonitor.recordMetric("file_upload_error", 1, "count", {
                        component: "file_upload",
                        errorCode: error.code,
                        severity: error.severity,
                      });

                      // Don't call handleApiError for file upload errors as they shouldn't affect auth state
                      const toastVariant = error.severity === "warning" ? "default" : "destructive";
                      const toastTitle =
                        error.severity === "warning" ? "Upload Warning" : "Upload Failed";

                      toast({
                        title: toastTitle,
                        description: error.message,
                        variant: toastVariant,
                      });

                      // Track file upload errors for form submission context
                      setFileUploadErrors(prev => [...prev, error.message]);
                    }}
                    acceptedFileTypes={["audio/*", ".zip", ".rar", ".7z"]}
                    maxFileSize={100 * 1024 * 1024} // 100MB
                    uploadDelay={2000} // Enable upload simulation for testing error handling
                    allowFormSubmissionOnError={true} // Allow form submission even if file upload fails
                    maxRetries={3} // Allow up to 3 retry attempts
                    className="w-full"
                  />
                </div>

                {/* Display uploaded files */}
                {uploadedFiles.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm text-gray-300 font-medium">✓ Uploaded files:</p>
                    {uploadedFiles.map((file, index) => (
                      <div
                        key={`${file.name}-${file.size}-${index}`}
                        className="flex items-center justify-between bg-green-900/20 border border-green-500/30 p-3 rounded"
                      >
                        <div className="flex items-center gap-2">
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-white text-sm">{file.name}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            handleFileRemove(index);
                            // Clear any related errors when file is removed
                            setFileUploadErrors(prev => prev.slice(0, -1));
                          }}
                          className="text-red-400 hover:text-red-300 text-sm"
                        >
                          Remove
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Display file upload errors with helpful context */}
                {fileUploadErrors.length > 0 && (
                  <div className="space-y-2">
                    <div className="bg-yellow-900/20 border border-yellow-500/30 p-3 rounded">
                      <div className="flex items-start gap-2">
                        <AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 flex-shrink-0" />
                        <div>
                          <p className="text-yellow-300 text-sm font-medium">
                            File Upload Issues Detected
                          </p>
                          <p className="text-yellow-200 text-xs mt-1">
                            Don&apos;t worry - you can still submit your reservation! Files can be
                            sent later via email or cloud storage.
                          </p>
                          {fileUploadErrors.length > 0 && (
                            <button
                              type="button"
                              onClick={() => setFileUploadErrors([])}
                              className="text-yellow-400 hover:text-yellow-300 text-xs underline mt-2"
                            >
                              Dismiss notices
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <p className="text-gray-500 text-xs">
                    <strong>File Upload Tips:</strong> Files will be securely stored and processed
                    after booking confirmation.
                  </p>
                  <p className="text-gray-500 text-xs">
                    <strong>Alternative Options:</strong> You can also send files via email or share
                    cloud storage links (Google Drive, Dropbox, etc.) after booking.
                  </p>
                  <p className="text-green-400 text-xs">
                    ✓ <strong>Form Submission:</strong> Your reservation will work perfectly even
                    without file uploads.
                  </p>
                </div>
              </div>

              {/* Submit Button */}
              <div className="text-center">
                <Button
                  type="submit"
                  disabled={
                    isSubmitting ||
                    authState.isLoading ||
                    isValidating ||
                    (hasBeenSubmitted && !isFormValid)
                  }
                  className="btn-primary px-8 py-3 text-lg min-w-[280px] relative"
                >
                  {isSubmitting ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Processing Reservation...</span>
                    </div>
                  ) : isValidating ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Validating Form...</span>
                    </div>
                  ) : authState.isLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin" />
                      <span>Loading Authentication...</span>
                    </div>
                  ) : (
                    <div className="flex items-center justify-center gap-2">
                      <ArrowRight className="w-5 h-5" />
                      <span>Reserve Session - ${selectedServiceData?.price}</span>
                    </div>
                  )}
                </Button>
                {/* Enhanced Form Status Messages */}
                <div className="mt-4 space-y-2">
                  {/* Authentication Status */}
                  {authState.isLoading && (
                    <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Loading your account information...</span>
                    </div>
                  )}

                  {!authState.isLoading && !authState.isAuthenticated && (
                    <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                      <Info className="w-4 h-4" />
                      <span>
                        You&apos;ll be prompted to sign in before completing your reservation.
                      </span>
                    </div>
                  )}

                  {authState.isAuthenticated && !hasBeenSubmitted && !isSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>Ready to book! We&apos;ll contact you within 24 hours to confirm.</span>
                    </div>
                  )}

                  {/* Form Validation Status */}
                  {hasBeenSubmitted && !isFormValid && (
                    <div className="flex items-center justify-center gap-2 text-sm text-red-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Please fix the errors above before submitting.</span>
                    </div>
                  )}

                  {isValidating && (
                    <div className="flex items-center justify-center gap-2 text-sm text-blue-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Validating your information...</span>
                    </div>
                  )}

                  {/* Submission Status */}
                  {isSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-purple-400">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Creating your reservation and preparing checkout...</span>
                    </div>
                  )}

                  {/* File Upload Status Messages */}
                  {fileUploadErrors.length > 0 && !isSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-yellow-400">
                      <AlertTriangle className="w-4 h-4" />
                      <span>
                        File upload issues detected, but you can still submit your reservation.
                      </span>
                    </div>
                  )}

                  {uploadedFiles.length > 0 && !isSubmitting && (
                    <div className="flex items-center justify-center gap-2 text-sm text-green-400">
                      <CheckCircle className="w-4 h-4" />
                      <span>
                        {uploadedFiles.length} file{uploadedFiles.length > 1 ? "s" : ""} ready to
                        include with your reservation.
                      </span>
                    </div>
                  )}

                  {uploadedFiles.length === 0 &&
                    fileUploadErrors.length === 0 &&
                    !isSubmitting &&
                    !authState.isLoading && (
                      <div className="flex items-center justify-center gap-2 text-sm text-gray-400">
                        <Info className="w-4 h-4" />
                        <span>
                          Files are optional - you can send them later via email or cloud storage.
                        </span>
                      </div>
                    )}

                  {/* Progress Indicator for Form Completion */}
                  {!authState.isLoading && !isSubmitting && (
                    <div className="mt-4 p-3 bg-gray-900/30 rounded-lg">
                      <div className="flex items-center justify-between text-xs text-gray-400 mb-2">
                        <span>Form Completion</span>
                        <span>
                          {Math.round(
                            (((formData.name ? 1 : 0) +
                              (formData.email ? 1 : 0) +
                              (formData.preferredDate ? 1 : 0) +
                              (formData.timeSlot ? 1 : 0) +
                              (formData.projectDetails ? 1 : 0)) /
                              5) *
                              100
                          )}
                          %
                        </span>
                      </div>
                      <div className="w-full bg-gray-700 rounded-full h-1.5">
                        <div
                          className="bg-gradient-to-r from-[var(--accent-purple)] to-blue-500 h-1.5 rounded-full transition-all duration-300"
                          style={{
                            width: `${(((formData.name ? 1 : 0) + (formData.email ? 1 : 0) + (formData.preferredDate ? 1 : 0) + (formData.timeSlot ? 1 : 0) + (formData.projectDetails ? 1 : 0)) / 5) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Main component with safe error boundary
export default function MixingMastering() {
  return (
    <SafeMixingMasteringErrorBoundary>
      <MixingMasteringContent />
    </SafeMixingMasteringErrorBoundary>
  );
}
