// Conversion Funnel Tracking Component

import React, { useEffect, useState } from "react";
import { ConversionFunnel, FunnelStep, InteractionType } from "../../../shared/types/analytics";
import { useAnalytics } from "../hooks/useAnalytics";

interface ConversionFunnelTrackerProps {
  funnelId?: string;
  autoTrack?: boolean;
  onStepComplete?: (stepId: string, funnelId: string) => void;
  onFunnelComplete?: (funnelId: string) => void;
}

interface FunnelProgress {
  currentStep: number;
  completedSteps: string[];
  startTime: number;
  lastStepTime: number;
}

const ConversionFunnelTracker: React.FC<ConversionFunnelTrackerProps> = ({
  funnelId,
  autoTrack = true,
  onStepComplete,
  onFunnelComplete,
}) => {
  const { trackConversion, trackInteraction } = useAnalytics();
  const [funnels, setFunnels] = useState<ConversionFunnel[]>([]);
  const [activeFunnel, setActiveFunnel] = useState<ConversionFunnel | null>(null);
  const [funnelProgress, setFunnelProgress] = useState<Record<string, FunnelProgress>>({});
  const [isTracking, setIsTracking] = useState(false);

  // Default e-commerce funnel
  const defaultFunnel: ConversionFunnel = {
    id: "ecommerce_default",
    name: "E-commerce Conversion Funnel",
    isActive: true,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    steps: [
      {
        id: "product_view",
        name: "Product View",
        description: "User views a product page",
        order: 1,
        conditions: [
          {
            field: "url",
            operator: "contains",
            value: "/product/",
          },
        ],
        requiredInteractions: ["view"],
      },
      {
        id: "add_to_cart",
        name: "Add to Cart",
        description: "User adds product to cart",
        order: 2,
        conditions: [
          {
            field: "action",
            operator: "equals",
            value: "add_to_cart",
          },
        ],
        requiredInteractions: ["add_to_cart"],
        timeLimit: 300000, // 5 minutes
      },
      {
        id: "checkout_start",
        name: "Checkout Started",
        description: "User starts checkout process",
        order: 3,
        conditions: [
          {
            field: "url",
            operator: "contains",
            value: "/checkout",
          },
        ],
        requiredInteractions: ["navigation"],
        timeLimit: 600000, // 10 minutes
      },
      {
        id: "purchase_complete",
        name: "Purchase Complete",
        description: "User completes purchase",
        order: 4,
        conditions: [
          {
            field: "action",
            operator: "equals",
            value: "purchase",
          },
        ],
        requiredInteractions: ["purchase"],
        timeLimit: 900000, // 15 minutes
      },
    ],
  };

  // Initialize funnels
  useEffect(() => {
    const initializeFunnels = () => {
      const initialFunnels = [defaultFunnel];
      setFunnels(initialFunnels);

      if (funnelId) {
        const funnel = initialFunnels.find(f => f.id === funnelId);
        setActiveFunnel(funnel || null);
      } else {
        setActiveFunnel(defaultFunnel);
      }
    };

    initializeFunnels();
  }, [funnelId]);

  // Start tracking when component mounts
  useEffect(() => {
    if (autoTrack && activeFunnel) {
      setIsTracking(true);
      startFunnelTracking(activeFunnel.id);
    }

    return () => {
      setIsTracking(false);
    };
  }, [autoTrack, activeFunnel]);

  const startFunnelTracking = (funnelId: string) => {
    if (!funnelProgress[funnelId]) {
      setFunnelProgress(prev => ({
        ...prev,
        [funnelId]: {
          currentStep: 0,
          completedSteps: [],
          startTime: Date.now(),
          lastStepTime: Date.now(),
        },
      }));
    }
  };

  const checkStepConditions = (step: FunnelStep, interactionData: any): boolean => {
    return step.conditions.every(condition => {
      const fieldValue = interactionData[condition.field];

      switch (condition.operator) {
        case "equals":
          return fieldValue === condition.value;
        case "contains":
          return typeof fieldValue === "string" && fieldValue.includes(condition.value as string);
        case "starts_with":
          return typeof fieldValue === "string" && fieldValue.startsWith(condition.value as string);
        case "ends_with":
          return typeof fieldValue === "string" && fieldValue.endsWith(condition.value as string);
        case "greater_than":
          return typeof fieldValue === "number" && fieldValue > (condition.value as number);
        case "less_than":
          return typeof fieldValue === "number" && fieldValue < (condition.value as number);
        default:
          return false;
      }
    });
  };

  const trackFunnelStep = async (
    funnelId: string,
    stepId: string,
    interactionData: any,
    value?: number
  ) => {
    const funnel = funnels.find(f => f.id === funnelId);
    if (!funnel) return;

    const step = funnel.steps.find(s => s.id === stepId);
    if (!step) return;

    const progress = funnelProgress[funnelId];
    if (!progress) return;

    // Check if step is already completed
    if (progress.completedSteps.includes(stepId)) return;

    // Check time limit if specified
    if (step.timeLimit) {
      const timeSinceLastStep = Date.now() - progress.lastStepTime;
      if (timeSinceLastStep > step.timeLimit) {
        // Reset funnel if time limit exceeded
        setFunnelProgress(prev => ({
          ...prev,
          [funnelId]: {
            currentStep: 0,
            completedSteps: [],
            startTime: Date.now(),
            lastStepTime: Date.now(),
          },
        }));
        return;
      }
    }

    // Check if this is the next expected step
    const expectedStep = funnel.steps.find(s => s.order === progress.currentStep + 1);
    if (!expectedStep || expectedStep.id !== stepId) return;

    // Track the conversion
    await trackConversion(funnelId, stepId, value);

    // Update progress
    const newProgress = {
      ...progress,
      currentStep: progress.currentStep + 1,
      completedSteps: [...progress.completedSteps, stepId],
      lastStepTime: Date.now(),
    };

    setFunnelProgress(prev => ({
      ...prev,
      [funnelId]: newProgress,
    }));

    // Call callbacks
    onStepComplete?.(stepId, funnelId);

    // Check if funnel is complete
    if (newProgress.completedSteps.length === funnel.steps.length) {
      onFunnelComplete?.(funnelId);

      // Track funnel completion
      await trackInteraction("purchase", "funnel", "complete", {
        funnelId,
        completionTime: Date.now() - newProgress.startTime,
        stepsCompleted: newProgress.completedSteps.length,
        value,
      });
    }
  };

  // Auto-track based on URL and interactions
  useEffect(() => {
    if (!isTracking || !activeFunnel) return;

    const handleInteraction = (event: any) => {
      const interaction = {
        url: window.location.href,
        action: event.detail?.action || event.type,
        component: event.detail?.component || "unknown",
        ...event.detail,
      };

      // Check each step to see if conditions are met
      activeFunnel.steps.forEach(step => {
        if (
          step.requiredInteractions.includes(interaction.action as InteractionType) &&
          checkStepConditions(step, interaction)
        ) {
          trackFunnelStep(activeFunnel.id, step.id, interaction, event.detail?.value);
        }
      });
    };

    // Listen for custom analytics events
    window.addEventListener("analytics-interaction", handleInteraction);

    // Auto-track page views for funnel steps
    const currentUrl = window.location.href;
    activeFunnel.steps.forEach(step => {
      if (
        step.requiredInteractions.includes("view") &&
        checkStepConditions(step, { url: currentUrl })
      ) {
        trackFunnelStep(activeFunnel.id, step.id, { url: currentUrl, action: "view" });
      }
    });

    return () => {
      window.removeEventListener("analytics-interaction", handleInteraction);
    };
  }, [isTracking, activeFunnel, funnelProgress]);

  // Manual tracking methods
  const trackStep = async (stepId: string, value?: number) => {
    if (!activeFunnel) return;

    const interactionData = {
      url: window.location.href,
      action: stepId,
      component: "manual",
    };

    await trackFunnelStep(activeFunnel.id, stepId, interactionData, value);
  };

  const resetFunnel = (funnelId?: string) => {
    const targetFunnelId = funnelId || activeFunnel?.id;
    if (!targetFunnelId) return;

    setFunnelProgress(prev => ({
      ...prev,
      [targetFunnelId]: {
        currentStep: 0,
        completedSteps: [],
        startTime: Date.now(),
        lastStepTime: Date.now(),
      },
    }));
  };

  const getFunnelProgress = (funnelId?: string) => {
    const targetFunnelId = funnelId || activeFunnel?.id;
    return targetFunnelId ? funnelProgress[targetFunnelId] : null;
  };

  const getCurrentStep = (funnelId?: string) => {
    const progress = getFunnelProgress(funnelId);
    if (!progress || !activeFunnel) return null;

    return activeFunnel.steps.find(step => step.order === progress.currentStep + 1);
  };

  const getCompletionRate = (funnelId?: string) => {
    const progress = getFunnelProgress(funnelId);
    if (!progress || !activeFunnel) return 0;

    return progress.completedSteps.length / activeFunnel.steps.length;
  };

  // Expose tracking methods via window object for easy access
  useEffect(() => {
    if (typeof window !== "undefined") {
      (window as any).funnelTracker = {
        trackStep,
        resetFunnel,
        getFunnelProgress,
        getCurrentStep,
        getCompletionRate,
        trackProductView: () => trackStep("product_view"),
        trackAddToCart: (value?: number) => trackStep("add_to_cart", value),
        trackCheckoutStart: () => trackStep("checkout_start"),
        trackPurchase: (value?: number) => trackStep("purchase_complete", value),
      };
    }

    return () => {
      if (typeof window !== "undefined") {
        delete (window as any).funnelTracker;
      }
    };
  }, [activeFunnel]);

  // Render funnel progress (optional visual component)
  if (!activeFunnel) return null;

  const progress = getFunnelProgress();
  const completionRate = getCompletionRate();

  return (
    <div className="funnel-tracker" style={{ display: "none" }}>
      {/* Hidden component that handles tracking logic */}
      <div className="funnel-progress">
        <div className="funnel-name">{activeFunnel.name}</div>
        <div className="progress-bar">
          <div className="progress-fill" style={{ width: `${completionRate * 100}%` }} />
        </div>
        <div className="step-indicators">
          {activeFunnel.steps.map((step, index) => (
            <div
              key={step.id}
              className={`step-indicator ${
                progress?.completedSteps.includes(step.id) ? "completed" : ""
              } ${progress?.currentStep === index ? "current" : ""}`}
            >
              {step.name}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ConversionFunnelTracker;
