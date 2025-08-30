import { PricingTable, SignIn, useUser } from "@clerk/clerk-react";
import { useEffect, useState } from "react";

// Composant wrapper qui détecte les erreurs Clerk et affiche des alternatives
export function ClerkPricingTableWithFallback() {
  const { isLoaded, user } = useUser();
  const [clerkError, setClerkError] = useState(false);

  useEffect(() => {
    // Détecter les erreurs Clerk après 3 secondes
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setClerkError(true);
        console.warn("Clerk timeout detected, using fallback");
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (clerkError) {
    return (
      <div className="max-w-4xl mx-auto">
        <div className="text-center p-8 bg-blue-900/20 border border-blue-600/30 rounded-lg">
          <h3 className="text-2xl font-bold text-blue-200 mb-4">
            🚀 Plans d'abonnement disponibles
          </h3>
          <p className="text-blue-200 mb-6">
            The native Clerk subscription system will be available once the environment is
            optimized. En attendant, voici les plans disponibles :
          </p>

          {/* Plans basiques en attendant Clerk */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
            <div className="bg-[var(--medium-gray)] rounded-lg p-6">
              <h4 className="text-xl font-bold text-white mb-2">Free</h4>
              <p className="text-3xl font-bold text-white mb-4">
                $0<span className="text-lg text-gray-400">/mois</span>
              </p>
              <p className="text-gray-300 mb-4">Parfait pour commencer</p>
              <button className="w-full bg-gray-600 text-white py-2 px-4 rounded hover:bg-gray-700 transition-colors">
                Plan actuel
              </button>
            </div>

            <div className="bg-[var(--medium-gray)] rounded-lg p-6 ring-2 ring-[var(--accent-purple)]">
              <h4 className="text-xl font-bold text-white mb-2">Basic</h4>
              <p className="text-3xl font-bold text-white mb-4">
                $4.99<span className="text-lg text-gray-400">/mois</span>
              </p>
              <p className="text-gray-300 mb-4">5 downloads per month</p>
              <button className="w-full bg-[var(--accent-purple)] text-white py-2 px-4 rounded hover:bg-[var(--accent-purple)]/90 transition-colors">
                Choisir ce plan
              </button>
            </div>

            <div className="bg-[var(--medium-gray)] rounded-lg p-6">
              <h4 className="text-xl font-bold text-white mb-2">Ultimate</h4>
              <p className="text-3xl font-bold text-white mb-4">
                $25<span className="text-lg text-gray-400">/mois</span>
              </p>
              <p className="text-gray-300 mb-4">Unlimited downloads</p>
              <button className="w-full bg-[var(--accent-purple)] text-white py-2 px-4 rounded hover:bg-[var(--accent-purple)]/90 transition-colors">
                Choisir ce plan
              </button>
            </div>
          </div>

          <p className="text-sm text-gray-400 mt-6">
            💡 Native Clerk plans with secure payments will be active in production
          </p>
        </div>
      </div>
    );
  }

  // Si pas d'erreur, essayer d'afficher la PricingTable native
  return (
    <div className="max-w-4xl mx-auto">
      <PricingTable />
    </div>
  );
}

export function ClerkSignInWithFallback() {
  const { isLoaded } = useUser();
  const [clerkError, setClerkError] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!isLoaded) {
        setClerkError(true);
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [isLoaded]);

  if (clerkError) {
    return (
      <div className="max-w-md mx-auto">
        <div className="text-center p-8 bg-yellow-900/20 border border-yellow-600/30 rounded-lg">
          <h3 className="text-2xl font-bold text-yellow-200 mb-4">
            Connexion temporairement indisponible
          </h3>
          <p className="text-yellow-200 mb-4">
            The sign-in system will be fully functional in production.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="bg-[var(--accent-purple)] hover:bg-[var(--accent-purple)]/90 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return <SignIn />;
}
