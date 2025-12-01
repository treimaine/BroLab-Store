/* eslint-disable react-refresh/only-export-components -- Modal component exports both component and management hook */
import { Button } from "@/components/ui/button";
import { Gift, Mail, X } from "lucide-react";
import { useEffect, useState } from "react";

interface NewsletterModalProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function NewsletterModal({ isOpen, onClose }: NewsletterModalProps): JSX.Element | null {
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email) return;

    setIsSubmitting(true);

    try {
      // Replace with actual Mailchimp or newsletter service integration
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate API call

      setIsSubmitted(true);

      // Store that user has signed up
      localStorage.setItem("brolab-newsletter-signup", "true");

      // Close modal after success message
      setTimeout(() => {
        onClose();
        setIsSubmitted(false);
        setEmail("");
      }, 2000);
    } catch (error) {
      console.error("Newsletter signup error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-black/70 backdrop-blur-sm border-none cursor-default"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-2xl p-8 max-w-md w-full mx-4 animate-fadeIn">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {isSubmitted ? (
          /* Success state */
          <div className="text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Gift className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Welcome to the family!</h2>
            <p className="text-gray-300 mb-4">
              Check your email for your free beat pack and exclusive producer content.
            </p>
            <div className="w-8 h-8 border-2 border-[var(--accent-purple)]/30 border-t-[var(--accent-purple)] rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-[var(--accent-purple)]/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Gift className="w-8 h-8 text-[var(--accent-purple)]" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Get Your Free Beat Pack!</h2>
              <p className="text-gray-300">
                Join our newsletter and receive 3 exclusive beats + producer tips straight to your
                inbox.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Enter your email address"
                  required
                  className="w-full pl-11 pr-4 py-3 bg-[var(--deep-black)] border border-[var(--medium-gray)] rounded-lg text-white placeholder-gray-400 focus:border-[var(--accent-purple)] focus:outline-none transition-colors"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting || !email}
                className="w-full btn-primary py-3"
              >
                {isSubmitting ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Signing up...
                  </div>
                ) : (
                  "Get My Free Beats"
                )}
              </Button>
            </form>

            {/* Footer */}
            <p className="text-xs text-gray-400 text-center mt-4">
              No spam, ever. Unsubscribe anytime with one click.
            </p>
          </>
        )}
      </div>
    </div>
  );
}

// Hook to manage newsletter modal
export function useNewsletterModal() {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Check if user has already signed up
    const hasSignedUp = localStorage.getItem("brolab-newsletter-signup");

    if (!hasSignedUp) {
      // Show modal after a delay on first visit
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 10000); // 10 seconds delay

      return () => clearTimeout(timer);
    }

    return undefined;
  }, []);

  const openModal = () => setIsOpen(true);
  const closeModal = () => setIsOpen(false);

  return {
    isOpen,
    openModal,
    closeModal,
  };
}

export default NewsletterModal;
