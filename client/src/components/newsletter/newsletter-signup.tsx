import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Mail, X } from "lucide-react";
import { useState } from "react";

interface NewsletterSignupProps {
  readonly isOpen: boolean;
  readonly onClose: () => void;
}

export function NewsletterSignup({
  isOpen,
  onClose,
}: Readonly<NewsletterSignupProps>): JSX.Element | null {
  const [email, setEmail] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (!email) return;

    setIsLoading(true);
    try {
      await apiRequest("POST", "/api/newsletter/subscribe", { email });
      toast({
        title: "Success!",
        description: "You've been subscribed to our newsletter.",
      });
      setEmail("");
      onClose();
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Failed to subscribe";
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-[var(--dark-gray)] border border-[var(--medium-gray)] rounded-xl p-8 max-w-md w-full relative">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </Button>

        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[var(--accent-purple)] rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-white" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Stay Updated</h2>
          <p className="text-gray-300">
            Get the latest beats, exclusive samples, and producer tips delivered to your inbox.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="Enter your email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            className="w-full"
            required
          />
          <Button type="submit" disabled={isLoading} className="w-full btn-primary">
            {isLoading ? "Subscribing..." : "Subscribe Now"}
          </Button>
        </form>

        <p className="text-xs text-gray-400 text-center mt-4">
          We respect your privacy. Unsubscribe at any time.
        </p>
      </div>
    </div>
  );
}
