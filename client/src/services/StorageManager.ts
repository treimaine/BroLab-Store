/**
 * StorageManager - Centralized localStorage management with type safety
 *
 * Replaces 20+ direct localStorage calls with a typed, error-resilient interface.
 * Implements TTL support for expiring items and graceful fallbacks.
 *
 * @see Requirements 6.1, 6.3, 6.4, 6.5
 */

import type { CartItem } from "@/lib/cart";

// Storage key constants for type safety
export const STORAGE_KEYS = {
  CART: "cart",
  LANGUAGE: "language",
  RECENTLY_VIEWED: "recently_viewed",
  SESSION_ID: "session_id",
  TRACKING_QUEUE: "tracking_queue",
  ERROR_LOGS: "error_logs",
  DEBUG_MODE: "debug_mode",
  CONFIG_OVERRIDES: "config_overrides",
  ACTIVE_TABS: "active_tabs",
  NEWSLETTER_SIGNUP: "newsletter-signup",
  ANALYTICS_CONSENT: "analytics-consent",
  ANALYTICS_INTERACTIONS: "analytics_interactions",
  CURRENCY: "currency",
  COUNTRY: "country",
  DEBUG_MIXING_MASTERING: "debug-mixing-mastering",
  DASHBOARD_CONFIG_OVERRIDES: "dashboard-config-overrides",
  RECENTLY_VIEWED_BEATS: "recently_viewed_beats",
} as const;

export type StorageKey = (typeof STORAGE_KEYS)[keyof typeof STORAGE_KEYS];

export interface StorageOptions {
  prefix?: string;
  ttl?: number; // Time to live in milliseconds
}

interface StoredItem<T> {
  value: T;
  expiresAt?: number;
  storedAt: number;
}

/**
 * Check if localStorage is available
 */
function isLocalStorageAvailable(): boolean {
  try {
    const testKey = "__storage_test__";
    if (globalThis.window === undefined || !globalThis.localStorage) {
      return false;
    }
    globalThis.localStorage.setItem(testKey, testKey);
    globalThis.localStorage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * Type-safe localStorage manager
 * Replaces 20+ direct localStorage calls with consistent error handling
 */
class StorageManagerClass {
  private readonly prefix: string;
  private readonly defaultTTL?: number;
  private readonly isAvailable: boolean;

  constructor(options: StorageOptions = {}) {
    this.prefix = options.prefix || "brolab_";
    this.defaultTTL = options.ttl;
    this.isAvailable = isLocalStorageAvailable();
  }

  /**
   * Get the full storage key with prefix
   */
  private getKey(key: string): string {
    return `${this.prefix}${key}`;
  }

  /**
   * Check if storage is available
   */
  public checkAvailability(): boolean {
    return this.isAvailable;
  }

  /**
   * Get a value from storage with type safety
   * Returns defaultValue if key doesn't exist, is expired, or on error
   */
  get<T>(key: string, defaultValue?: T): T | undefined {
    if (!this.isAvailable) {
      return defaultValue;
    }

    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) {
        return defaultValue;
      }

      const item: StoredItem<T> = JSON.parse(raw);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key);
        return defaultValue;
      }

      return item.value;
    } catch (error) {
      console.warn(`[StorageManager] Failed to read key "${key}":`, error);
      return defaultValue;
    }
  }

  /**
   * Set a value in storage with optional TTL
   */
  set<T>(key: string, value: T, ttl?: number): boolean {
    if (!this.isAvailable) {
      console.warn("[StorageManager] localStorage not available");
      return false;
    }

    try {
      const effectiveTTL = ttl ?? this.defaultTTL;
      const item: StoredItem<T> = {
        value,
        storedAt: Date.now(),
        expiresAt: effectiveTTL ? Date.now() + effectiveTTL : undefined,
      };

      localStorage.setItem(this.getKey(key), JSON.stringify(item));
      return true;
    } catch (error) {
      console.warn(`[StorageManager] Failed to write key "${key}":`, error);
      return false;
    }
  }

  /**
   * Remove a key from storage
   */
  remove(key: string): boolean {
    if (!this.isAvailable) {
      return false;
    }

    try {
      localStorage.removeItem(this.getKey(key));
      return true;
    } catch (error) {
      console.warn(`[StorageManager] Failed to remove key "${key}":`, error);
      return false;
    }
  }

  /**
   * Check if a key exists and is not expired
   */
  has(key: string): boolean {
    if (!this.isAvailable) {
      return false;
    }

    try {
      const raw = localStorage.getItem(this.getKey(key));
      if (!raw) {
        return false;
      }

      const item: StoredItem<unknown> = JSON.parse(raw);

      // Check expiration
      if (item.expiresAt && Date.now() > item.expiresAt) {
        this.remove(key);
        return false;
      }

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Clear all items with this manager's prefix
   */
  clear(): void {
    if (!this.isAvailable) {
      return;
    }

    try {
      const keys = Object.keys(localStorage);
      keys.filter(key => key.startsWith(this.prefix)).forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.warn("[StorageManager] Failed to clear storage:", error);
    }
  }

  /**
   * Get all keys managed by this instance
   */
  keys(): string[] {
    if (!this.isAvailable) {
      return [];
    }

    try {
      return Object.keys(localStorage)
        .filter(key => key.startsWith(this.prefix))
        .map(key => key.slice(this.prefix.length));
    } catch {
      return [];
    }
  }

  // ============================================
  // Typed getters/setters for common storage keys
  // ============================================

  /**
   * Get cart items from storage
   * TTL: 7 days
   */
  getCart(): CartItem[] {
    return this.get<CartItem[]>(STORAGE_KEYS.CART, []) ?? [];
  }

  /**
   * Set cart items in storage with 7-day TTL
   */
  setCart(items: CartItem[]): boolean {
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    return this.set(STORAGE_KEYS.CART, items, SEVEN_DAYS_MS);
  }

  /**
   * Get current language preference
   */
  getLanguage(): string {
    return this.get<string>(STORAGE_KEYS.LANGUAGE, "en") ?? "en";
  }

  /**
   * Set language preference (no expiration)
   */
  setLanguage(lang: string): boolean {
    return this.set(STORAGE_KEYS.LANGUAGE, lang);
  }

  /**
   * Get recently viewed beat IDs
   */
  getRecentlyViewed(): string[] {
    return this.get<string[]>(STORAGE_KEYS.RECENTLY_VIEWED, []) ?? [];
  }

  /**
   * Set recently viewed beat IDs (keep last 20)
   */
  setRecentlyViewed(ids: string[]): boolean {
    return this.set(STORAGE_KEYS.RECENTLY_VIEWED, ids.slice(0, 20));
  }

  /**
   * Add a beat ID to recently viewed
   */
  addRecentlyViewed(id: string): boolean {
    const current = this.getRecentlyViewed();
    // Remove if exists, add to front
    const filtered = current.filter(existingId => existingId !== id);
    const updated = [id, ...filtered].slice(0, 20);
    return this.setRecentlyViewed(updated);
  }

  /**
   * Get or create session ID for tracking
   */
  getSessionId(): string {
    let sessionId = this.get<string>(STORAGE_KEYS.SESSION_ID);
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substring(2, 11)}`;
      this.set(STORAGE_KEYS.SESSION_ID, sessionId);
    }
    return sessionId;
  }

  /**
   * Get debug mode status
   */
  getDebugMode(): boolean {
    return this.get<boolean>(STORAGE_KEYS.DEBUG_MODE, false) ?? false;
  }

  /**
   * Set debug mode status
   */
  setDebugMode(enabled: boolean): boolean {
    return this.set(STORAGE_KEYS.DEBUG_MODE, enabled);
  }

  /**
   * Get configuration overrides
   */
  getConfigOverrides<T extends Record<string, unknown>>(): T {
    return this.get<T>(STORAGE_KEYS.CONFIG_OVERRIDES, {} as T) ?? ({} as T);
  }

  /**
   * Set configuration overrides
   */
  setConfigOverrides<T extends Record<string, unknown>>(overrides: T): boolean {
    const existing = this.getConfigOverrides<T>();
    const merged = { ...existing, ...overrides };
    return this.set(STORAGE_KEYS.CONFIG_OVERRIDES, merged);
  }

  /**
   * Get newsletter signup status
   */
  getNewsletterSignup(): boolean {
    return this.get<boolean>(STORAGE_KEYS.NEWSLETTER_SIGNUP, false) ?? false;
  }

  /**
   * Set newsletter signup status
   */
  setNewsletterSignup(signedUp: boolean): boolean {
    return this.set(STORAGE_KEYS.NEWSLETTER_SIGNUP, signedUp);
  }

  /**
   * Get analytics consent data
   */
  getAnalyticsConsent(): { granted: boolean; timestamp: number; version: string } | null {
    return (
      this.get<{ granted: boolean; timestamp: number; version: string }>(
        STORAGE_KEYS.ANALYTICS_CONSENT
      ) ?? null
    );
  }

  /**
   * Set analytics consent data
   */
  setAnalyticsConsent(consent: { granted: boolean; timestamp: number; version: string }): boolean {
    return this.set(STORAGE_KEYS.ANALYTICS_CONSENT, consent);
  }

  /**
   * Remove analytics consent
   */
  removeAnalyticsConsent(): boolean {
    return this.remove(STORAGE_KEYS.ANALYTICS_CONSENT);
  }

  /**
   * Get currency preference
   */
  getCurrency(): string {
    return this.get<string>(STORAGE_KEYS.CURRENCY, "USD") ?? "USD";
  }

  /**
   * Set currency preference
   */
  setCurrency(currency: string): boolean {
    return this.set(STORAGE_KEYS.CURRENCY, currency);
  }

  /**
   * Get country code
   */
  getCountry(): string {
    return this.get<string>(STORAGE_KEYS.COUNTRY, "US") ?? "US";
  }

  /**
   * Set country code
   */
  setCountry(country: string): boolean {
    return this.set(STORAGE_KEYS.COUNTRY, country);
  }

  /**
   * Get tracking queue
   */
  getTrackingQueue<T>(): T[] {
    return this.get<T[]>(STORAGE_KEYS.TRACKING_QUEUE, []) ?? [];
  }

  /**
   * Set tracking queue
   */
  setTrackingQueue<T>(queue: T[]): boolean {
    return this.set(STORAGE_KEYS.TRACKING_QUEUE, queue);
  }

  /**
   * Remove tracking queue
   */
  removeTrackingQueue(): boolean {
    return this.remove(STORAGE_KEYS.TRACKING_QUEUE);
  }

  /**
   * Get error logs
   */
  getErrorLogs<T>(): T[] {
    return this.get<T[]>(STORAGE_KEYS.ERROR_LOGS, []) ?? [];
  }

  /**
   * Set error logs
   */
  setErrorLogs<T>(logs: T[]): boolean {
    return this.set(STORAGE_KEYS.ERROR_LOGS, logs);
  }

  /**
   * Remove error logs
   */
  removeErrorLogs(): boolean {
    return this.remove(STORAGE_KEYS.ERROR_LOGS);
  }

  /**
   * Get active tabs
   */
  getActiveTabs<T>(): T[] {
    return this.get<T[]>(STORAGE_KEYS.ACTIVE_TABS, []) ?? [];
  }

  /**
   * Set active tabs
   */
  setActiveTabs<T>(tabs: T[]): boolean {
    return this.set(STORAGE_KEYS.ACTIVE_TABS, tabs);
  }

  /**
   * Get dashboard config overrides
   */
  getDashboardConfigOverrides<T extends Record<string, unknown>>(): T {
    return this.get<T>(STORAGE_KEYS.DASHBOARD_CONFIG_OVERRIDES, {} as T) ?? ({} as T);
  }

  /**
   * Set dashboard config overrides
   */
  setDashboardConfigOverrides<T extends Record<string, unknown>>(overrides: T): boolean {
    return this.set(STORAGE_KEYS.DASHBOARD_CONFIG_OVERRIDES, overrides);
  }

  /**
   * Remove dashboard config overrides
   */
  removeDashboardConfigOverrides(): boolean {
    return this.remove(STORAGE_KEYS.DASHBOARD_CONFIG_OVERRIDES);
  }

  /**
   * Get mixing-mastering debug mode
   */
  getMixingMasteringDebug(): boolean {
    return this.get<boolean>(STORAGE_KEYS.DEBUG_MIXING_MASTERING, false) ?? false;
  }

  /**
   * Set mixing-mastering debug mode
   */
  setMixingMasteringDebug(enabled: boolean): boolean {
    if (enabled) {
      return this.set(STORAGE_KEYS.DEBUG_MIXING_MASTERING, true);
    }
    return this.remove(STORAGE_KEYS.DEBUG_MIXING_MASTERING);
  }

  /**
   * Get recently viewed beats with full data
   */
  getRecentlyViewedBeats<T>(): T[] {
    return this.get<T[]>(STORAGE_KEYS.RECENTLY_VIEWED_BEATS, []) ?? [];
  }

  /**
   * Set recently viewed beats with full data
   */
  setRecentlyViewedBeats<T>(beats: T[]): boolean {
    return this.set(STORAGE_KEYS.RECENTLY_VIEWED_BEATS, beats);
  }

  /**
   * Remove recently viewed beats
   */
  removeRecentlyViewedBeats(): boolean {
    return this.remove(STORAGE_KEYS.RECENTLY_VIEWED_BEATS);
  }
}

// Export singleton instance
export const storage = new StorageManagerClass();

// Export class for custom instances
export { StorageManagerClass as StorageManager };

// Default export for convenience
export default storage;
