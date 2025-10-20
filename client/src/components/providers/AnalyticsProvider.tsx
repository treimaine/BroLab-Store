// Privacy-compliant Analytics Provider Component

import React, { createContext, useContext, useEffect, useState } from "react";
import { AnalyticsConfig, PrivacySettings } from "@shared/types/analytics";
import { analyticsManager } from "@shared/utils/analytics-manager";

interface AnalyticsContextType {
  isInitialized: boolean;
  isTrackingEnabled: boolean;
  privacySettings: PrivacySettings | null;
  config: AnalyticsConfig | null;
  updatePrivacySettings: (settings: Partial<PrivacySettings>) => Promise<void>;
  updateConfig: (config: Partial<AnalyticsConfig>) => void;
  requestConsent: () => Promise<boolean>;
  revokeConsent: () => Promise<void>;
  showPrivacyBanner: boolean;
  setShowPrivacyBanner: (show: boolean) => void;
}

const AnalyticsContext = createContext<AnalyticsContextType | null>(null);

export const useAnalyticsContext = () => {
  const context = useContext(AnalyticsContext);
  if (!context) {
    throw new Error("useAnalyticsContext must be used within an AnalyticsProvider");
  }
  return context;
};

interface AnalyticsProviderProps {
  children: React.ReactNode;
  defaultConfig?: Partial<AnalyticsConfig>;
  requireConsent?: boolean;
  showBanner?: boolean;
}

const AnalyticsProvider: React.FC<AnalyticsProviderProps> = ({
  children,
  defaultConfig = {},
  requireConsent = true,
  showBanner = true,
}) => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isTrackingEnabled, setIsTrackingEnabled] = useState(false);
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings | null>(null);
  const [config, setConfig] = useState<AnalyticsConfig | null>(null);
  const [showPrivacyBanner, setShowPrivacyBanner] = useState(false);
  const [consentGiven, setConsentGiven] = useState(false);

  // Initialize analytics
  useEffect(() => {
    const initializeAnalytics = async () => {
      try {
        // Configure analytics manager
        const initialConfig: Partial<AnalyticsConfig> = {
          enabled: true,
          privacy: {
            trackingEnabled: !requireConsent,
            anonymizeIPs: true,
            respectDoNotTrack: true,
            cookieConsent: false,
            dataRetentionDays: 365,
            allowPersonalization: true,
            shareWithThirdParties: false,
            gdprCompliant: true,
          },
          sampling: {
            enabled: false,
            rate: 1.0,
          },
          realTime: {
            enabled: true,
            updateInterval: 5000,
          },
          storage: {
            local: true,
            remote: true,
            compression: false,
          },
          debug: process.env.NODE_ENV === "development",
          ...defaultConfig,
        };

        analyticsManager.configure(initialConfig);

        // Get current settings
        const currentPrivacySettings = await analyticsManager.getPrivacySettings();
        const currentConfig = analyticsManager.getConfig();

        setPrivacySettings(currentPrivacySettings);
        setConfig(currentConfig);
        setIsTrackingEnabled(analyticsManager.isTrackingAllowed());

        // Check for existing consent
        const existingConsent = localStorage.getItem("analytics-consent");
        if (existingConsent) {
          const consentData = JSON.parse(existingConsent);
          setConsentGiven(consentData.granted);

          if (consentData.granted) {
            await analyticsManager.setPrivacySettings({
              trackingEnabled: true,
              cookieConsent: true,
            });
            setIsTrackingEnabled(true);
          }
        } else if (requireConsent && showBanner) {
          // Show consent banner if no consent exists
          setShowPrivacyBanner(true);
        }

        // Check for Do Not Track
        if (typeof navigator !== "undefined" && navigator.doNotTrack === "1") {
          await analyticsManager.setPrivacySettings({
            trackingEnabled: false,
          });
          setIsTrackingEnabled(false);
        }

        setIsInitialized(true);
      } catch (error) {
        console.error("Failed to initialize analytics:", error);
        setIsInitialized(true); // Still mark as initialized to prevent blocking
      }
    };

    initializeAnalytics();
  }, [defaultConfig, requireConsent, showBanner]);

  const updatePrivacySettings = async (settings: Partial<PrivacySettings>) => {
    try {
      await analyticsManager.setPrivacySettings(settings);
      const updatedSettings = await analyticsManager.getPrivacySettings();
      setPrivacySettings(updatedSettings);
      setIsTrackingEnabled(analyticsManager.isTrackingAllowed());
    } catch (error) {
      console.error("Failed to update privacy settings:", error);
      throw error;
    }
  };

  const updateConfig = (newConfig: Partial<AnalyticsConfig>) => {
    try {
      analyticsManager.configure(newConfig);
      const updatedConfig = analyticsManager.getConfig();
      setConfig(updatedConfig);
      setIsTrackingEnabled(analyticsManager.isTrackingAllowed());
    } catch (error) {
      console.error("Failed to update analytics config:", error);
      throw error;
    }
  };

  const requestConsent = async (): Promise<boolean> => {
    try {
      // Store consent
      const consentData = {
        granted: true,
        timestamp: Date.now(),
        version: "1.0",
      };
      localStorage.setItem("analytics-consent", JSON.stringify(consentData));

      // Enable tracking
      await updatePrivacySettings({
        trackingEnabled: true,
        cookieConsent: true,
      });

      setConsentGiven(true);
      setShowPrivacyBanner(false);
      return true;
    } catch (error) {
      console.error("Failed to grant consent:", error);
      return false;
    }
  };

  const revokeConsent = async () => {
    try {
      // Remove consent
      localStorage.removeItem("analytics-consent");

      // Disable tracking and clear data
      await updatePrivacySettings({
        trackingEnabled: false,
        cookieConsent: false,
      });

      // Clear stored analytics data
      localStorage.removeItem("analytics_interactions");

      setConsentGiven(false);
      setShowPrivacyBanner(false);
    } catch (error) {
      console.error("Failed to revoke consent:", error);
      throw error;
    }
  };

  const contextValue: AnalyticsContextType = {
    isInitialized,
    isTrackingEnabled,
    privacySettings,
    config,
    updatePrivacySettings,
    updateConfig,
    requestConsent,
    revokeConsent,
    showPrivacyBanner,
    setShowPrivacyBanner,
  };

  return (
    <AnalyticsContext.Provider value={contextValue}>
      {children}
      {showPrivacyBanner && <PrivacyConsentBanner />}
    </AnalyticsContext.Provider>
  );
};

// Privacy Consent Banner Component
const PrivacyConsentBanner: React.FC = () => {
  const { requestConsent, revokeConsent, setShowPrivacyBanner } = useAnalyticsContext();
  const [showDetails, setShowDetails] = useState(false);

  const handleAccept = async () => {
    await requestConsent();
  };

  const handleDecline = async () => {
    await revokeConsent();
    setShowPrivacyBanner(false);
  };

  return (
    <div className="privacy-consent-banner">
      <div className="banner-content">
        <div className="banner-text">
          <h3>Privacy & Analytics</h3>
          <p>
            We use analytics to improve your experience. We respect your privacy and comply with
            GDPR.
            {!showDetails && (
              <button className="details-link" onClick={() => setShowDetails(true)}>
                Learn more
              </button>
            )}
          </p>

          {showDetails && (
            <div className="privacy-details">
              <h4>What we collect:</h4>
              <ul>
                <li>Page views and navigation patterns</li>
                <li>Button clicks and interactions</li>
                <li>Device type and browser information</li>
                <li>Performance metrics</li>
              </ul>

              <h4>What we don't collect:</h4>
              <ul>
                <li>Personal information without consent</li>
                <li>Sensitive data</li>
                <li>Data from users who opt out</li>
              </ul>

              <h4>Your rights:</h4>
              <ul>
                <li>You can opt out at any time</li>
                <li>Request data deletion</li>
                <li>Export your data</li>
                <li>Control personalization settings</li>
              </ul>

              <button className="details-link" onClick={() => setShowDetails(false)}>
                Show less
              </button>
            </div>
          )}
        </div>

        <div className="banner-actions">
          <button className="decline-button" onClick={handleDecline}>
            Decline
          </button>
          <button className="accept-button" onClick={handleAccept}>
            Accept
          </button>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsProvider;
