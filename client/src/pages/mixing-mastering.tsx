import { AuthStatusBanner } from "@/components/mixing-mastering/AuthStatusBanner";
import { BookingForm } from "@/components/mixing-mastering/BookingForm";
import { FormValidationStatus } from "@/components/mixing-mastering/FormValidationStatus";
import { ProgressIndicator } from "@/components/mixing-mastering/ProgressIndicator";
import { ServiceCard } from "@/components/mixing-mastering/ServiceCard";
import { ReservationErrorBoundary } from "@/components/reservations/ReservationErrorBoundary";
import { StandardHero } from "@/components/ui/StandardHero";
import { useToast } from "@/hooks/use-toast";
import { useFormSubmissionWithRetry } from "@/hooks/useApiWithRetry";
import { useAuthState } from "@/hooks/useAuthState";
import { useFormValidation } from "@/hooks/useFormValidation";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import { logAuthError, logFileUpload, logUserAction, logger } from "@/lib/logger";
import {
  performanceMonitor,
  startTimer,
  trackComponentPerformance,
  trackUserInteraction,
} from "@/lib/performanceMonitor";
import { useAuth } from "@clerk/clerk-react";
import {
  mixingMasteringSubmissionSchema,
  type MixingMasteringSubmissionInput,
} from "@shared/validation";
import { useCallback, useEffect, useState } from "react";
import { useLocation } from "wouter";

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
  const { authState, clerkUser, clerkLoaded, isSignedIn } = useAuthState();
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
        url: globalThis.location.href,
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

  // Enhanced error handler that doesn't block page rendering
  const handleApiError = useCallback((error: Error, context?: string) => {
    const errorId = errorTracker.trackError(error, {
      errorType: context === "authentication" ? "authentication" : "api",
      component: "mixing_mastering",
      action: "api_error_handler",
      page: "mixing-mastering",
      errorCode: error.message.includes("401") ? 401 : undefined,
      recoverable: true,
      context: context || "unknown",
    });

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
  }, []);

  const [selectedService, setSelectedService] = useState("mixing-mastering");
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUploadErrors, setFileUploadErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // File upload handlers
  const handleFileUploadSuccess = useCallback(
    (file: File) => {
      setUploadedFiles(prev => [...prev, file]);
      logFileUpload("File uploaded successfully", file.name, {
        component: "mixing_mastering",
        action: "file_upload_success",
        fileSize: file.size,
        fileType: file.type,
        totalFiles: uploadedFiles.length + 1,
      });
      addBreadcrumb({
        category: "user_action",
        message: `File uploaded successfully: ${file.name}`,
        level: "info",
        data: { fileName: file.name, fileSize: file.size, fileType: file.type },
      });
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
    },
    [uploadedFiles.length, toast]
  );

  const handleFileUploadError = useCallback(
    (error: {
      message: string;
      code: string;
      severity?: "warning" | "error";
      recoverable?: boolean;
    }) => {
      const errorObj = new Error(error.message);
      Object.assign(errorObj, {
        code: error.code,
        severity: error.severity,
        recoverable: error.recoverable,
      });

      const errorId = errorTracker.trackError(errorObj, {
        errorType: "file_upload",
        component: "mixing_mastering",
        action: "file_upload_failed",
        errorCode: error.code,
        recoverable: error.recoverable ?? true,
        severity: error.severity,
      });

      addBreadcrumb({
        category: "error",
        message: `File upload failed: ${error.message}`,
        level: error.severity === "warning" ? "warning" : "error",
        data: { errorCode: error.code, errorMessage: error.message, errorId },
      });

      performanceMonitor.recordMetric("file_upload_error", 1, "count", {
        component: "file_upload",
        errorCode: error.code,
        severity: error.severity,
      });

      const toastVariant = error.severity === "warning" ? "default" : "destructive";
      const toastTitle = error.severity === "warning" ? "Upload Warning" : "Upload Failed";

      toast({ title: toastTitle, description: error.message, variant: toastVariant });
      setFileUploadErrors(prev => [...prev, error.message]);
    },
    [toast]
  );

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
    globalThis.scrollTo(0, 0);
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

  // Wrapper for getFieldError to accept string
  const getFieldErrorWrapper = (field: string): string | undefined => {
    return getFieldError(field as keyof MixingMasteringSubmissionInput);
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
              : validatedData.selectedService,
          clientInfo: {
            firstName: validatedData.name.split(" ")[0] || validatedData.name,
            lastName: validatedData.name.split(" ").slice(1).join(" ") || "User",
            email: validatedData.email,
            phone: validatedData.phone || "0000000000", // Provide default phone if empty
          },
          preferredDate: new Date(
            `${validatedData.preferredDate}T${convertTimeSlotTo24Hour(validatedData.timeSlot)}`
          ).toISOString(),
          preferredDuration: 180, // 3 hours default for mixing/mastering
          serviceDetails: {
            trackCount: Number.parseInt(validatedData.trackCount || "1", 10) || 1,
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

        // Create pending payment for checkout (consistent with other services)
        const pendingPayment = {
          service: selectedService,
          serviceName: selectedServiceData?.name || "Mixing & Mastering",
          serviceDetails: validatedData.projectDetails,
          reservationId: reservationResult.id,
          price: selectedServiceData?.price || 0,
          quantity: 1,
        };

        // Add to existing services array (consistent with other services)
        const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");
        const updatedServices = [...existingServices, pendingPayment];
        sessionStorage.setItem("pendingServices", JSON.stringify(updatedServices));

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
        <AuthStatusBanner
          isLoading={authState.isLoading}
          isAuthenticated={authState.isAuthenticated}
          hasError={authState.hasError}
          errorMessage={authState.errorMessage}
        />

        <FormValidationStatus
          hasBeenSubmitted={hasBeenSubmitted}
          isFormValid={isFormValid}
          formErrors={formErrors}
          retryCount={retryCount}
        />

        <ProgressIndicator
          selectedServiceName={selectedServiceData?.name}
          selectedServicePrice={selectedServiceData?.price}
        />

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
            <ServiceCard
              key={service.id}
              service={service}
              isSelected={selectedService === service.id}
              onSelect={() => {
                logUserAction(`Service selected: ${service.name}`, {
                  component: "mixing_mastering",
                  action: "service_selection",
                  serviceId: service.id,
                  serviceName: service.name,
                  servicePrice: service.price,
                  previousService: selectedService,
                });

                trackUserInteraction("service_selection", "service_card", undefined, {
                  serviceId: service.id,
                  serviceName: service.name,
                  servicePrice: service.price,
                  previousService: selectedService,
                });

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
            />
          ))}
        </div>

        {/* Booking Form */}
        <BookingForm
          selectedServiceData={selectedServiceData}
          authState={authState}
          formData={formData}
          isFormValid={isFormValid}
          isValidating={isValidating}
          hasBeenSubmitted={hasBeenSubmitted}
          isSubmitting={isSubmitting}
          uploadedFiles={uploadedFiles}
          fileUploadErrors={fileUploadErrors}
          timeSlots={timeSlots}
          onInputChange={handleInputChange}
          onBlur={handleBlur}
          onSubmit={handleSubmit}
          onFileUploadSuccess={handleFileUploadSuccess}
          onFileUploadError={handleFileUploadError}
          onFileRemove={handleFileRemove}
          getFieldError={getFieldErrorWrapper}
        />
      </div>
    </div>
  );
}

// Main component with safe error boundary
export default function MixingMastering() {
  return (
    <ReservationErrorBoundary
      serviceName="Mixing & Mastering"
      onGoBack={() => globalThis.history.back()}
    >
      <MixingMasteringContent />
    </ReservationErrorBoundary>
  );
}
