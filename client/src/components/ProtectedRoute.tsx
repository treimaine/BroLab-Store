import { Protect } from "@clerk/clerk-react";
import { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  plan?: string;
  feature?: string;
  fallback?: ReactNode;
  redirectTo?: string;
}

export function ProtectedRoute({
  children,
  plan,
  feature,
  fallback,
  redirectTo = "/membership",
}: ProtectedRouteProps) {
  if (plan) {
    return (
      <Protect
        plan={plan}
        fallback={
          fallback || (
            <div className="min-h-screen bg-[var(--dark-gray)] flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Subscription Required</h1>
                <p className="text-gray-300 mb-6">
                  This content is only available to {plan} subscribers.
                </p>
                <a
                  href={redirectTo}
                  className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Upgrade Now
                </a>
              </div>
            </div>
          )
        }
      >
        {children}
      </Protect>
    );
  }

  if (feature) {
    return (
      <Protect
        feature={feature}
        fallback={
          fallback || (
            <div className="min-h-screen bg-[var(--dark-gray)] flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-white mb-4">Feature Access Required</h1>
                <p className="text-gray-300 mb-6">This content requires the {feature} feature.</p>
                <a
                  href={redirectTo}
                  className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
                >
                  Upgrade Now
                </a>
              </div>
            </div>
          )
        }
      >
        {children}
      </Protect>
    );
  }

  // Si aucun plan ou feature n'est spécifié, protéger par authentification simple
  return (
    <Protect
      fallback={
        fallback || (
          <div className="min-h-screen bg-[var(--dark-gray)] flex items-center justify-center">
            <div className="text-center">
              <h1 className="text-2xl font-bold text-white mb-4">Authentication Required</h1>
              <p className="text-gray-300 mb-6">Please sign in to access this content.</p>
              <a
                href="/login"
                className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white font-semibold py-3 px-6 rounded-lg transition-colors"
              >
                Sign In
              </a>
            </div>
          </div>
        )
      }
    >
      {children}
    </Protect>
  );
}
