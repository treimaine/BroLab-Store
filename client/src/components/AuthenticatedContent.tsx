import { SignInButton } from "@clerk/clerk-react";
import { Authenticated, AuthLoading, Unauthenticated } from "convex/react";
import { ReactNode } from "react";
import { ProtectedRoute } from "./ProtectedRoute";

interface AuthenticatedContentProps {
  children: ReactNode;
  fallback?: ReactNode;
  loadingFallback?: ReactNode;
}

export function AuthenticatedContent({
  children,
  fallback,
  loadingFallback,
}: AuthenticatedContentProps) {
  return (
    <>
      <Unauthenticated>
        {fallback || (
          <div className="min-h-screen flex items-center justify-center bg-[var(--deep-black)]">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
              <p className="text-gray-300 mb-6">Please sign in to access this content</p>
              <SignInButton mode="modal" />
            </div>
          </div>
        )}
      </Unauthenticated>

      <Authenticated>{children}</Authenticated>

      <AuthLoading>
        {loadingFallback || (
          <div className="min-h-screen flex items-center justify-center bg-[var(--deep-black)]">
            <div
              className="animate-spin w-8 h-8 border-4 border-primary border-t-transparent rounded-full"
              aria-label="Loading"
            />
          </div>
        )}
      </AuthLoading>
    </>
  );
}

// Composant spécialisé pour les pages protégées
export function ProtectedPage({
  children,
  plan,
  feature,
}: {
  children: ReactNode;
  plan?: string;
  feature?: string;
}) {
  return (
    <AuthenticatedContent>
      <ProtectedRoute plan={plan} feature={feature}>
        {children}
      </ProtectedRoute>
    </AuthenticatedContent>
  );
}
