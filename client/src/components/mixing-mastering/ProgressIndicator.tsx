import { CheckCircle } from "lucide-react";
import { useEffect, useState } from "react";

type StepStatus = "completed" | "active" | "upcoming";

interface Step {
  id: number;
  label: string;
  status: StepStatus;
}

interface ProgressIndicatorProps {
  readonly currentStep: 1 | 2 | 3;
  readonly selectedServiceName?: string;
  readonly selectedServicePrice?: number;
}

export function ProgressIndicator({
  currentStep,
  selectedServiceName,
  selectedServicePrice,
}: ProgressIndicatorProps): JSX.Element {
  const [isVisible, setIsVisible] = useState(false);

  // Fade in on mount
  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 100);
    return () => clearTimeout(timer);
  }, []);

  const getStepStatus = (stepId: number): StepStatus => {
    if (currentStep > stepId) return "completed";
    if (currentStep === stepId) return "active";
    return "upcoming";
  };

  const steps: Step[] = [
    { id: 1, label: "Select Package", status: getStepStatus(1) },
    { id: 2, label: "Details", status: getStepStatus(2) },
    { id: 3, label: "Pay", status: getStepStatus(3) },
  ];

  const getStepStyles = (status: StepStatus): string => {
    switch (status) {
      case "completed":
        return "bg-[var(--accent-purple)] text-white scale-100";
      case "active":
        return "bg-[var(--accent-purple)] text-white scale-105 ring-2 ring-[var(--accent-purple)]/30";
      case "upcoming":
        return "bg-gray-700 text-gray-400 scale-100";
    }
  };

  const getLabelStyles = (status: StepStatus): string => {
    switch (status) {
      case "completed":
      case "active":
        return "text-white font-medium";
      case "upcoming":
        return "text-gray-400";
    }
  };

  const getLineStyles = (stepIndex: number): string => {
    // Line after step 1 (between 1 and 2)
    if (stepIndex === 0) {
      return currentStep > 1 ? "bg-[var(--accent-purple)]" : "bg-gray-600";
    }
    // Line after step 2 (between 2 and 3)
    if (stepIndex === 1) {
      return currentStep > 2 ? "bg-[var(--accent-purple)]" : "bg-gray-600";
    }
    return "bg-gray-600";
  };

  return (
    <div
      className={`sticky top-16 z-40 mb-8 py-4 transition-all duration-500 ${
        isVisible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2"
      }`}
    >
      {/* Glass background */}
      <div className="absolute inset-0 bg-[var(--deep-black)]/80 backdrop-blur-md -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 rounded-b-lg" />

      <div className="relative max-w-2xl mx-auto">
        {/* Steps */}
        <div className="flex items-center justify-between">
          {steps.map((step, index) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              {/* Step circle + label */}
              <div className="flex flex-col items-center gap-2">
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm transition-all duration-300 ${getStepStyles(step.status)}`}
                >
                  {step.status === "completed" ? <CheckCircle className="w-5 h-5" /> : step.id}
                </div>
                <span
                  className={`text-xs sm:text-sm whitespace-nowrap transition-colors duration-300 ${getLabelStyles(step.status)}`}
                >
                  {step.label}
                </span>
              </div>

              {/* Connector line (not after last step) */}
              {index < steps.length - 1 && (
                <div className="flex-1 mx-3 sm:mx-6">
                  <div className="h-0.5 bg-gray-600 rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ease-out ${getLineStyles(index)}`}
                      style={{
                        width: currentStep > index + 1 ? "100%" : "0%",
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Selected service info */}
        {selectedServiceName && selectedServicePrice && (
          <div className="mt-3 text-center">
            <p className="text-xs sm:text-sm text-gray-400">
              <span className="text-[var(--accent-purple)] font-medium">{selectedServiceName}</span>
              {" · "}
              <span className="text-white font-semibold">${selectedServicePrice}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
