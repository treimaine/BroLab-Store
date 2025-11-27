/**
 * Configuration Manager
 * Handles runtime configuration updates and persistence
 */

import { FEATURE_FLAGS, getDashboardConfig } from "@/config/dashboard";
import { validateDashboardConfig } from "@/utils/configValidator";
import type { DashboardConfig } from "@shared/types/dashboard";

export interface ConfigUpdateOptions {
  persist?: boolean;
  validate?: boolean;
  broadcast?: boolean;
}

export interface ConfigSubscriber {
  id: string;
  callback: (config: DashboardConfig) => void;
}

class ConfigurationManager {
  private config: DashboardConfig;
  private readonly subscribers: Map<string, ConfigSubscriber> = new Map();
  private readonly storageKey = "dashboard-config-overrides";

  constructor() {
    this.config = getDashboardConfig();
    this.loadPersistedOverrides();
  }

  /**
   * Get current configuration
   */
  getConfig(): DashboardConfig {
    return { ...this.config };
  }

  /**
   * Update configuration
   */
  updateConfig(updates: Partial<DashboardConfig>, options: ConfigUpdateOptions = {}): boolean {
    const { persist = false, validate = true, broadcast = true } = options;

    try {
      // Create new configuration
      const newConfig: DashboardConfig = {
        ...this.config,
        ...updates,
      };

      // Validate if requested
      if (validate) {
        const validation = validateDashboardConfig(newConfig, { strict: false });
        if (!validation.isValid) {
          console.error("Configuration validation failed:", validation.errors);
          return false;
        }

        if (validation.warnings.length > 0) {
          console.warn("Configuration warnings:", validation.warnings);
        }
      }

      // Update configuration
      this.config = newConfig;

      // Persist if requested
      if (persist) {
        this.persistOverrides(updates);
      }

      // Broadcast to subscribers
      if (broadcast) {
        this.notifySubscribers();
      }

      if (import.meta.env.DEV) {
        console.log("Configuration updated successfully");
      }
      return true;
    } catch (error) {
      console.error("Failed to update configuration:", error);
      return false;
    }
  }

  /**
   * Update UI configuration
   */
  updateUIConfig(updates: Partial<DashboardConfig["ui"]>): boolean {
    return this.updateConfig({ ui: { ...this.config.ui, ...updates } });
  }

  /**
   * Update pagination configuration
   */
  updatePaginationConfig(updates: Partial<DashboardConfig["pagination"]>): boolean {
    return this.updateConfig({ pagination: { ...this.config.pagination, ...updates } });
  }

  /**
   * Update real-time configuration
   */
  updateRealtimeConfig(updates: Partial<DashboardConfig["realtime"]>): boolean {
    return this.updateConfig({ realtime: { ...this.config.realtime, ...updates } });
  }

  /**
   * Update feature flags
   */
  updateFeatures(updates: Partial<DashboardConfig["features"]>): boolean {
    return this.updateConfig({ features: { ...this.config.features, ...updates } });
  }

  /**
   * Reset configuration to defaults
   */
  resetConfig(): boolean {
    try {
      this.config = getDashboardConfig();
      this.clearPersistedOverrides();
      this.notifySubscribers();
      if (import.meta.env.DEV) {
        console.log("Configuration reset to defaults");
      }
      return true;
    } catch (error) {
      console.error("Failed to reset configuration:", error);
      return false;
    }
  }

  /**
   * Subscribe to configuration changes
   */
  subscribe(id: string, callback: (config: DashboardConfig) => void): () => void {
    this.subscribers.set(id, { id, callback });

    // Return unsubscribe function
    return () => {
      this.subscribers.delete(id);
    };
  }

  /**
   * Unsubscribe from configuration changes
   */
  unsubscribe(id: string): void {
    this.subscribers.delete(id);
  }

  /**
   * Get feature flag value
   */
  isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
    // Check if the feature is in the dashboard config features
    if (feature in this.config.features) {
      return (this.config.features as Record<string, boolean>)[feature] ?? false;
    }
    // Fall back to the global feature flags
    return FEATURE_FLAGS[feature];
  }

  /**
   * Toggle feature flag
   */
  toggleFeature(feature: keyof typeof FEATURE_FLAGS): boolean {
    const currentValue = this.isFeatureEnabled(feature);
    return this.updateFeatures({ [feature]: !currentValue });
  }

  /**
   * Get configuration override status
   */
  getOverrideStatus(): {
    hasOverrides: boolean;
    overrides: Partial<DashboardConfig>;
  } {
    const stored = this.getStoredOverrides();
    return {
      hasOverrides: Object.keys(stored).length > 0,
      overrides: stored,
    };
  }

  /**
   * Export configuration
   */
  exportConfig(): string {
    return JSON.stringify(this.config, null, 2);
  }

  /**
   * Import configuration
   */
  importConfig(configJson: string): boolean {
    try {
      const importedConfig = JSON.parse(configJson) as DashboardConfig;
      return this.updateConfig(importedConfig, { validate: true, persist: true });
    } catch (error) {
      console.error("Failed to import configuration:", error);
      return false;
    }
  }

  /**
   * Notify all subscribers of configuration changes
   */
  private notifySubscribers(): void {
    const config = this.getConfig();
    this.subscribers.forEach(subscriber => {
      try {
        subscriber.callback(config);
      } catch (error) {
        console.error(`Error notifying subscriber ${subscriber.id}:`, error);
      }
    });
  }

  /**
   * Persist configuration overrides to localStorage
   */
  private persistOverrides(overrides: Partial<DashboardConfig>): void {
    try {
      const existing = this.getStoredOverrides();
      const merged = { ...existing, ...overrides };
      localStorage.setItem(this.storageKey, JSON.stringify(merged));
    } catch (error) {
      console.error("Failed to persist configuration overrides:", error);
    }
  }

  /**
   * Load persisted configuration overrides
   */
  private loadPersistedOverrides(): void {
    try {
      const overrides = this.getStoredOverrides();
      if (Object.keys(overrides).length > 0) {
        this.updateConfig(overrides, { persist: false, broadcast: false });
        if (import.meta.env.DEV) {
          console.log("Loaded persisted configuration overrides");
        }
      }
    } catch (error) {
      console.error("Failed to load persisted configuration overrides:", error);
    }
  }

  /**
   * Get stored configuration overrides
   */
  private getStoredOverrides(): Partial<DashboardConfig> {
    try {
      const stored = localStorage.getItem(this.storageKey);
      return stored ? JSON.parse(stored) : {};
    } catch (error) {
      console.error("Failed to get stored configuration overrides:", error);
      return {};
    }
  }

  /**
   * Clear persisted configuration overrides
   */
  private clearPersistedOverrides(): void {
    try {
      localStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error("Failed to clear persisted configuration overrides:", error);
    }
  }
}

// Create singleton instance
export const configManager = new ConfigurationManager();

// Export utility functions
export function getConfig(): DashboardConfig {
  return configManager.getConfig();
}

export function updateConfig(
  updates: Partial<DashboardConfig>,
  options?: ConfigUpdateOptions
): boolean {
  return configManager.updateConfig(updates, options);
}

export function resetConfig(): boolean {
  return configManager.resetConfig();
}

export function subscribeToConfig(
  id: string,
  callback: (config: DashboardConfig) => void
): () => void {
  return configManager.subscribe(id, callback);
}

export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return configManager.isFeatureEnabled(feature);
}

export function toggleFeature(feature: keyof typeof FEATURE_FLAGS): boolean {
  return configManager.toggleFeature(feature);
}

export function exportConfig(): string {
  return configManager.exportConfig();
}

export function importConfig(configJson: string): boolean {
  return configManager.importConfig(configJson);
}

// React hook for configuration management
export function useConfigManager() {
  return {
    getConfig: () => configManager.getConfig(),
    updateConfig: (updates: Partial<DashboardConfig>, options?: ConfigUpdateOptions) =>
      configManager.updateConfig(updates, options),
    updateUIConfig: (updates: Partial<DashboardConfig["ui"]>) =>
      configManager.updateUIConfig(updates),
    updatePaginationConfig: (updates: Partial<DashboardConfig["pagination"]>) =>
      configManager.updatePaginationConfig(updates),
    updateRealtimeConfig: (updates: Partial<DashboardConfig["realtime"]>) =>
      configManager.updateRealtimeConfig(updates),
    updateFeatures: (updates: Partial<DashboardConfig["features"]>) =>
      configManager.updateFeatures(updates),
    resetConfig: () => configManager.resetConfig(),
    isFeatureEnabled: (feature: keyof typeof FEATURE_FLAGS) =>
      configManager.isFeatureEnabled(feature),
    toggleFeature: (feature: keyof typeof FEATURE_FLAGS) => configManager.toggleFeature(feature),
    getOverrideStatus: () => configManager.getOverrideStatus(),
    exportConfig: () => configManager.exportConfig(),
    importConfig: (configJson: string) => configManager.importConfig(configJson),
    subscribe: (id: string, callback: (config: DashboardConfig) => void) =>
      configManager.subscribe(id, callback),
    unsubscribe: (id: string) => configManager.unsubscribe(id),
  };
}
