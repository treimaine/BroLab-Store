/**
 * Payment Secrets Validation
 *
 * Validates that payment providers are properly configured.
 * In production: fails fast if any enabled provider has missing required keys.
 * In development: logs warnings but allows server to start.
 */

import { getPaymentConfig, PaymentConfig } from "../config/paymentConfig";

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  summary: ProviderSummary[];
}

export interface ProviderSummary {
  name: string;
  status: "configured" | "partial" | "disabled";
  details?: string;
}

interface ProviderValidationInput {
  name: string;
  enabled: boolean;
  missingKeys: string[];
  isProduction: boolean;
  warningMessage: string;
  disabledDetails: string;
  configuredDetails: string;
  partialDetails: string;
}

interface ProviderValidationOutput {
  error?: string;
  warning?: string;
  summary: ProviderSummary;
}

/**
 * Validate a single provider configuration
 */
function validateProvider(input: ProviderValidationInput): ProviderValidationOutput {
  const {
    name,
    enabled,
    missingKeys,
    isProduction,
    warningMessage,
    disabledDetails,
    configuredDetails,
    partialDetails,
  } = input;

  if (!enabled) {
    return {
      summary: { name, status: "disabled", details: disabledDetails },
    };
  }

  if (missingKeys.length === 0) {
    return {
      summary: { name, status: "configured", details: configuredDetails },
    };
  }

  const missing = missingKeys.join(", ");
  const error = isProduction ? `${name}: Missing required keys: ${missing}` : undefined;
  const warning = isProduction
    ? undefined
    : `${name}: Missing keys (${missing}) - ${warningMessage}`;

  return {
    error,
    warning,
    summary: { name, status: "partial", details: partialDetails.replace("{missing}", missing) },
  };
}

/**
 * Validate all payment provider configurations
 */
export function validatePaymentSecrets(config?: PaymentConfig): ValidationResult {
  const paymentConfig = config || getPaymentConfig();

  const stripeResult = validateProvider({
    name: "Stripe",
    enabled: paymentConfig.stripe.enabled,
    missingKeys: paymentConfig.stripe.missingKeys,
    isProduction: paymentConfig.isProduction,
    warningMessage: "webhooks may not work",
    disabledDetails: "No Stripe keys configured",
    configuredDetails: "All required keys present",
    partialDetails: "Missing: {missing}",
  });

  const paypalResult = validateProvider({
    name: "PayPal",
    enabled: paymentConfig.paypal.enabled,
    missingKeys: paymentConfig.paypal.missingKeys,
    isProduction: paymentConfig.isProduction,
    warningMessage: "webhooks may not work",
    disabledDetails: "No PayPal keys configured",
    configuredDetails: `Mode: ${paymentConfig.paypal.mode}`,
    partialDetails: `Missing: {missing} (mode: ${paymentConfig.paypal.mode})`,
  });

  const clerkResult = validateProvider({
    name: "Clerk Billing",
    enabled: paymentConfig.clerkBilling.enabled,
    missingKeys: paymentConfig.clerkBilling.missingKeys,
    isProduction: paymentConfig.isProduction,
    warningMessage: "billing features may not work",
    disabledDetails: "CLERK_BILLING_ENABLED is not true",
    configuredDetails: "All required keys present",
    partialDetails: "Missing: {missing}",
  });

  const results = [stripeResult, paypalResult, clerkResult];
  const errors = results.map(r => r.error).filter((e): e is string => e !== undefined);
  const warnings = results.map(r => r.warning).filter((w): w is string => w !== undefined);
  const summary = results.map(r => r.summary);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    summary,
  };
}

const STATUS_ICONS: Record<ProviderSummary["status"], string> = {
  configured: "✅",
  partial: "⚠️",
  disabled: "⭕",
};

function getStatusIcon(status: ProviderSummary["status"]): string {
  return STATUS_ICONS[status];
}

function formatProviderLine(provider: ProviderSummary): string {
  const icon = getStatusIcon(provider.status);
  const statusText = provider.status.toUpperCase().padEnd(10);
  const details = (provider.details || "").slice(0, 30).padEnd(30);
  return `║ ${icon} ${provider.name.padEnd(15)} ${statusText} ${details} ║`;
}

function formatMessageLines(messages: string[]): string[] {
  return messages.map(msg => `║    • ${msg.slice(0, 55).padEnd(55)} ║`);
}

/**
 * Format validation result for console output
 */
export function formatValidationResult(result: ValidationResult): string {
  const header = [
    "\n╔══════════════════════════════════════════════════════════════╗",
    "║              PAYMENT CONFIGURATION STATUS                    ║",
    "╠══════════════════════════════════════════════════════════════╣",
  ];

  const providerLines = result.summary.map(formatProviderLine);

  const separator = ["╠══════════════════════════════════════════════════════════════╣"];

  const errorLines =
    result.errors.length > 0
      ? [
          "║ ❌ ERRORS (blocking in production):                          ║",
          ...formatMessageLines(result.errors),
        ]
      : [];

  const warningLines =
    result.warnings.length > 0
      ? [
          "║ ⚠️  WARNINGS:                                                 ║",
          ...formatMessageLines(result.warnings),
        ]
      : [];

  const successLine =
    result.isValid && result.warnings.length === 0
      ? ["║ ✅ All payment providers properly configured                 ║"]
      : [];

  const footer = ["╚══════════════════════════════════════════════════════════════╝\n"];

  return [
    ...header,
    ...providerLines,
    ...separator,
    ...errorLines,
    ...warningLines,
    ...successLine,
    ...footer,
  ].join("\n");
}

/**
 * Validate payment secrets and handle errors appropriately
 * - In production: throws if validation fails
 * - In development: logs warnings and continues
 */
export function enforcePaymentSecrets(): ValidationResult {
  const config = getPaymentConfig();
  const result = validatePaymentSecrets(config);

  // Always log the status
  console.log(formatValidationResult(result));

  // In production, fail fast if there are errors
  if (config.isProduction && !result.isValid) {
    const errorMessage = [
      "❌ FATAL: Payment configuration is incomplete for production",
      "",
      "The following issues must be resolved:",
      ...result.errors.map(e => `  • ${e}`),
      "",
      "The server cannot start with incomplete payment configuration in production.",
      "Please set the missing environment variables and restart.",
    ].join("\n");

    throw new Error(errorMessage);
  }

  return result;
}
