/**
 * Validates critical environment variables and returns missing ones.
 */
export function validateEnvConfig(): { isValid: boolean; missingVars: string[] } {
  const requiredVars = [
    { key: "VITE_CONVEX_URL", value: import.meta.env.VITE_CONVEX_URL },
    { key: "VITE_CLERK_PUBLISHABLE_KEY", value: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY },
  ];

  const missingVars = requiredVars.filter(v => !v.value).map(v => v.key);

  return {
    isValid: missingVars.length === 0,
    missingVars,
  };
}

/**
 * Validates Clerk publishable key format.
 */
export function validateClerkKeyFormat(key: string): boolean {
  return /^pk_(test|live)_/.test(key);
}
