import { useScrollToTop } from "@/hooks/use-scroll-to-top";
import { SignIn, SignUp } from "@clerk/clerk-react";
import { useLocation } from "wouter";

export default function Login() {
  const [location] = useLocation();
  const isSignup = location === "/signup";

  // Scroll to top when component mounts
  useScrollToTop();

  // Determine the redirect URL
  const getFallbackRedirectUrl = () => {
    // If the user comes from the payment page, return there
    const urlParams = new URLSearchParams(globalThis.location.search);
    const returnTo = urlParams.get("returnTo");

    if (returnTo) {
      return returnTo;
    }

    // Otherwise, redirect to the dashboard
    return "/dashboard";
  };

  return (
    <div className="pt-16 bg-[var(--dark-gray)] min-h-screen flex items-center justify-center">
      <div className="w-full max-w-md mx-auto px-4 sm:px-6 lg:px-8">
        {isSignup ? (
          <SignUp
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white font-semibold py-3 px-4 rounded-lg transition-colors",
                card: "bg-[var(--medium-gray)] shadow-lg border border-[var(--medium-gray)] rounded-xl",
                headerTitle: "text-white text-2xl font-bold",
                headerSubtitle: "text-gray-300",
                formFieldLabel: "text-white font-medium",
                formFieldInput:
                  "bg-[var(--dark-gray)] border-[var(--medium-gray)] text-white placeholder-gray-400 focus:border-[var(--accent-purple)] focus:ring-[var(--accent-purple)]",
                footerActionLink:
                  "text-[var(--accent-purple)] hover:text-[var(--accent-purple-light)]",
                dividerLine: "bg-[var(--medium-gray)]",
                dividerText: "text-gray-400",
                socialButtonsBlockButton:
                  "bg-[var(--dark-gray)] border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]",
                formFieldInputShowPasswordButton: "text-gray-400 hover:text-white",
              },
            }}
            fallbackRedirectUrl={getFallbackRedirectUrl()}
            signInUrl="/login"
          />
        ) : (
          <SignIn
            appearance={{
              elements: {
                formButtonPrimary:
                  "bg-[var(--accent-purple)] hover:bg-[var(--accent-purple-dark)] text-white font-semibold py-3 px-4 rounded-lg transition-colors",
                card: "bg-[var(--medium-gray)] shadow-lg border border-[var(--medium-gray)] rounded-xl",
                headerTitle: "text-white text-2xl font-bold",
                headerSubtitle: "text-gray-300",
                formFieldLabel: "text-white font-medium",
                formFieldInput:
                  "bg-[var(--dark-gray)] border-[var(--medium-gray)] text-white placeholder-gray-400 focus:border-[var(--accent-purple)] focus:ring-[var(--accent-purple)]",
                footerActionLink:
                  "text-[var(--accent-purple)] hover:text-[var(--accent-purple-light)]",
                dividerLine: "bg-[var(--medium-gray)]",
                dividerText: "text-gray-400",
                socialButtonsBlockButton:
                  "bg-[var(--dark-gray)] border-[var(--medium-gray)] text-white hover:bg-[var(--medium-gray)]",
                formFieldInputShowPasswordButton: "text-gray-400 hover:text-white",
              },
            }}
            fallbackRedirectUrl={getFallbackRedirectUrl()}
            signUpUrl="/signup"
          />
        )}
      </div>
    </div>
  );
}
