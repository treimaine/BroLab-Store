import { AuthStatusBanner } from "@/components/mixing-mastering/AuthStatusBanner";
import { BookingForm } from "@/components/mixing-mastering/BookingForm";
import { FormValidationStatus } from "@/components/mixing-mastering/FormValidationStatus";
import { ProgressIndicator } from "@/components/mixing-mastering/ProgressIndicator";
import { ServiceCard } from "@/components/mixing-mastering/ServiceCard";
import { ReservationErrorBoundary } from "@/components/reservations/ReservationErrorBoundary";
import { Button } from "@/components/ui/button";
import { StandardHero } from "@/components/ui/StandardHero";
import { useToast } from "@/hooks/use-toast";
import { useFormSubmissionWithRetry } from "@/hooks/useApiWithRetry";
import { useAuthState } from "@/hooks/useAuthState";
import { useFormValidation } from "@/hooks/useFormValidation";
import { addBreadcrumb, errorTracker } from "@/lib/errorTracker";
import { logAuthError, logFileUpload, logger, logUserAction } from "@/lib/logger";
import {
  performanceMonitor,
  startTimer,
  trackComponentPerformance,
  trackUserInteraction,
} from "@/lib/performanceMonitor";
import { useAuth, useClerk } from "@clerk/clerk-react";
import {
  mixingMasteringSubmissionSchema,
  type MixingMasteringSubmissionInput,
} from "@shared/validation";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation } from "wouter";

// Services with "Best for" + "Outcome" copy for conversion
const services = [
  {
    id: "mixing",
    name: "Professional Mixing",
    price: 70,
    duration: "3-5 business days",
    description: "Professional mixing with EQ, compression, effects, and spatial processing",
    bestFor: "Vocals need clarity, instruments need space",
    outcome: "Balanced mix, ready for mastering",
    features: [
      "Professional EQ and compression",
      "Spatial processing and effects",
      "Stereo width enhancement",
      "Up to 3 revisions included",
    ],
  },
  {
    id: "mastering",
    name: "Audio Mastering",
    price: 50,
    duration: "1-2 business days",
    description: "Professional mastering for streaming platforms and distribution",
    bestFor: "Final polish before release",
    outcome: "Loud, clear, translates on all devices",
    features: [
      "Loudness optimization",
      "Streaming platform compliance",
      "Multiple format delivery",
      "Reference track matching",
    ],
  },
  {
    id: "mixing-mastering",
    name: "Mixing + Mastering",
    price: 109,
    originalPrice: 120,
    duration: "4-6 business days",
    description: "Complete mixing and mastering package for your track",
    bestFor: "Release-ready single or EP",
    outcome: "Ready to upload to Spotify, Apple Music",
    features: [
      "Full mixing + mastering workflow",
      "Priority turnaround",
      "5 revisions included",
      "Stems delivery included",
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

function MixingMasteringContent(): JSX.Element {
  const componentMountTimer = startTimer("mixing_mastering_component_mount");
  const [, setLocation] = useLocation();
  const { authState, clerkUser, clerkLoaded, isSignedIn } = useAuthState();
  const { getToken } = useAuth();
  const { openSignIn } = useClerk();

  // Refs for smooth scrolling
  const servicesRef = useRef<HTMLDivElement>(null);
  const formRef = useRef<HTMLDivElement>(null);

  // State
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [uploadedFiles, setUploadedFiles] = useState<File[]>([]);
  const [fileUploadErrors, setFileUploadErrors] = useState<string[]>([]);
  const { toast } = useToast();

  // Calculate current step based on state
  const getCurrentStep = (): 1 | 2 | 3 => {
    if (!selectedService) return 1;
    return 2; // Step 3 only after successful submission (handled by redirect)
  };

  const currentStep = getCurrentStep();
  const selectedServiceData = services.find(s => s.id === selectedService);

  // Scroll handlers
  const scrollToServices = useCallback(() => {
    servicesRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    trackUserInteraction("cta_click", "book_session_hero", undefined, {
      component: "mixing_mastering",
      action: "scroll_to_services",
    });
  }, []);

  const scrollToForm = useCallback(() => {
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  // Log component mount
  useEffect(() => {
    const mountTime = componentMountTimer();
    trackComponentPerformance("MixingMasteringContent", mountTime, true);
    logger.logInfo("MixingMasteringContent component mounted", {
      component: "mixing_mastering",
      action: "component_mount",
      mountTime,
    });
    addBreadcrumb({
      category: "navigation",
      message: "Mixing & Mastering page loaded",
      level: "info",
      data: { url: globalThis.location.href, mountTime },
    });
    return () => {
      logger.logInfo("MixingMasteringContent component unmounting", {
        component: "mixing_mastering",
        action: "component_unmount",
      });
    };
  }, [componentMountTimer]);

  // Auto-scroll to top on mount
  useEffect(() => {
    globalThis.scrollTo(0, 0);
  }, []);

  // Error handler
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
      toast({
        title: "File Uploaded",
        description: `${file.name} added to your booking.`,
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
      errorTracker.trackError(errorObj, {
        errorType: "file_upload",
        component: "mixing_mastering",
        action: "file_upload_failed",
        errorCode: error.code,
        recoverable: error.recoverable ?? true,
        severity: error.severity,
      });
      toast({
        title: error.severity === "warning" ? "Upload Warning" : "Upload Failed",
        description: error.message,
        variant: error.severity === "warning" ? "default" : "destructive",
      });
      setFileUploadErrors(prev => [...prev, error.message]);
    },
    [toast]
  );

  const handleFileRemove = (index: number) => {
    const fileToRemove = uploadedFiles[index];
    logFileUpload("File removed by user", fileToRemove?.name, {
      component: "mixing_mastering",
      action: "file_remove",
      fileIndex: index,
    });
    setUploadedFiles(files => files.filter((_, i) => i !== index));
  };

  // Form validation
  const initialFormData = {
    name: "",
    email: "",
    phone: "",
    preferredDate: "",
    timeSlot: "",
    projectDetails: "",
    trackCount: "1",
    genre: "",
    reference: "",
    specialRequests: "",
    selectedService: "mixing" as "mixing" | "mastering" | "mixing-mastering",
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
  } = useFormValidation({
    schema: mixingMasteringSubmissionSchema,
    initialData: initialFormData,
    validateOnChange: true,
    validateOnBlur: true,
    debounceMs: 500,
  });

  // API submission with retry
  const {
    isLoading: isSubmitting,
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
      429: "Too many requests. Please wait a moment.",
    },
    getAuthToken: getToken,
  });

  // Auto-fill form when user data available
  useEffect(() => {
    if (!authState.isLoading && authState.isAuthenticated && clerkUser) {
      try {
        const fieldsToUpdate = {
          name: formData.name || clerkUser.fullName || "",
          email: formData.email || clerkUser.emailAddresses[0]?.emailAddress || "",
        };
        setFormData(fieldsToUpdate);
        logger.logInfo("Form auto-fill completed", {
          component: "mixing_mastering",
          action: "form_auto_fill",
          userId: clerkUser.id,
        });
      } catch (error) {
        handleApiError(error instanceof Error ? error : new Error(String(error)), "auto-fill");
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
  ]);

  // Update selected service in form
  useEffect(() => {
    if (selectedService) {
      updateField(
        "selectedService",
        selectedService as "mixing" | "mastering" | "mixing-mastering"
      );
    }
  }, [selectedService, updateField]);

  // Handle service selection
  const handleServiceSelect = (serviceId: string) => {
    logUserAction(`Service selected: ${serviceId}`, {
      component: "mixing_mastering",
      action: "service_selection",
      serviceId,
      previousService: selectedService,
    });
    trackUserInteraction("service_selection", "service_card", undefined, {
      serviceId,
      previousService: selectedService,
    });
    setSelectedService(serviceId);
    scrollToForm();
  };

  const handleInputChange = (field: keyof MixingMasteringSubmissionInput, value: string) => {
    logUserAction(`Form field changed: ${field}`, {
      component: "mixing_mastering",
      action: "form_field_change",
      field,
    });
    updateField(field, value);
  };

  const getFieldErrorWrapper = (field: string): string | undefined => {
    return getFieldError(field as keyof MixingMasteringSubmissionInput);
  };

  // Form submission
  const handleSubmit = createSubmitHandler(
    async (validatedData: MixingMasteringSubmissionInput) => {
      const submissionTimer = startTimer("form_submission");

      try {
        // Check auth - trigger Clerk sign-in if not authenticated
        if (!clerkLoaded) {
          toast({
            title: "Please Wait",
            description: "Loading authentication...",
            variant: "default",
          });
          return;
        }

        if (!isSignedIn || !clerkUser) {
          // Trigger Clerk sign-in modal
          openSignIn({
            redirectUrl: globalThis.location.href,
          });
          return;
        }

        logger.logInfo("Form submission proceeding", {
          component: "mixing_mastering",
          action: "form_submission_proceeding",
          userId: clerkUser.id,
        });

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
            includeRevisions: selectedService === "mixing-mastering" ? 5 : 3,
            rushDelivery: false,
          },
          notes: [
            validatedData.projectDetails,
            validatedData.specialRequests
              ? `Special Requests: ${validatedData.specialRequests}`
              : "",
            validatedData.reference ? `Reference: ${validatedData.reference}` : "",
            uploadedFiles.length > 0 ? `Files: ${uploadedFiles.map(f => f.name).join(", ")}` : "",
          ]
            .filter(Boolean)
            .join("\n\n")
            .trim(),
          budget: (selectedServiceData?.price || 0) * 100,
          acceptTerms: true,
        };

        const reservationResult = (await submitForm("/api/reservations", reservationData)) as {
          id: string;
        };

        logger.logInfo("Reservation created", {
          component: "mixing_mastering",
          action: "reservation_created",
          reservationId: reservationResult.id,
        });

        // Store for checkout
        const pendingPayment = {
          service: selectedService,
          serviceName: selectedServiceData?.name || "Mixing & Mastering",
          serviceDetails: validatedData.projectDetails,
          reservationId: reservationResult.id,
          price: selectedServiceData?.price || 0,
          quantity: 1,
        };

        const existingServices = JSON.parse(sessionStorage.getItem("pendingServices") || "[]");
        sessionStorage.setItem(
          "pendingServices",
          JSON.stringify([...existingServices, pendingPayment])
        );

        performanceMonitor.recordMetric("form_submission_success", submissionTimer(), "ms", {
          component: "form_submission",
          selectedService,
        });

        toast({
          title: "Added to Checkout",
          description: "Redirecting to payment...",
        });

        setLocation("/checkout");
      } catch (error) {
        logger.logError("Form submission failed", error, {
          errorType: "api",
          component: "mixing_mastering",
          action: "form_submission_error",
        });
      }
    }
  );

  return (
    <div className="min-h-screen bg-[var(--deep-black)]">
      <StandardHero
        title="Radio-ready Mix & Master in 4–6 business days"
        subtitle="Industry-standard mix, loudness optimized for streaming, delivered in WAV."
      >
        <div className="flex flex-col sm:flex-row gap-4 justify-center mb-6">
          <Button
            size="lg"
            className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white px-8 py-3 text-lg font-semibold"
            onClick={scrollToServices}
          >
            Book a session
          </Button>
          <Button
            variant="outline"
            size="lg"
            className="border-gray-500 text-white hover:bg-white/10 px-8 py-3 text-lg"
            onClick={scrollToServices}
          >
            Listen to samples
          </Button>
        </div>
        <p className="text-gray-400 text-sm">
          Up to 5 revisions • Turnaround 4–6 business days • Cancel anytime before work starts
        </p>
      </StandardHero>

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
          currentStep={currentStep}
          selectedServiceName={selectedServiceData?.name}
          selectedServicePrice={selectedServiceData?.price}
        />

        {/* Services Grid */}
        <div ref={servicesRef} className="scroll-mt-32">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
            {services.map(service => (
              <ServiceCard
                key={service.id}
                service={service}
                isSelected={selectedService === service.id}
                onSelect={() => handleServiceSelect(service.id)}
              />
            ))}
          </div>
        </div>

        {/* Booking Form - only show when service selected */}
        {selectedService && (
          <div ref={formRef} className="scroll-mt-32">
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
        )}

        {/* CTA when no service selected */}
        {!selectedService && (
          <div className="text-center py-8">
            <p className="text-gray-400 text-lg">👆 Select a package above to continue</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default function MixingMastering(): JSX.Element {
  return (
    <ReservationErrorBoundary
      serviceName="Mixing & Mastering"
      onGoBack={() => globalThis.history.back()}
    >
      <MixingMasteringContent />
    </ReservationErrorBoundary>
  );
}
