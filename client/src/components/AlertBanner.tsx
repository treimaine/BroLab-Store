import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Crown } from "lucide-react";
import { useLocation } from "wouter";

interface AlertBannerProps {
  downloadsRemaining: number;
}

export function AlertBanner({ downloadsRemaining }: AlertBannerProps) {
  const [, setLocation] = useLocation();

  // Only show alert when downloads remaining is 0
  if (downloadsRemaining > 0) {
    return null;
  }

  const handleUpgradeClick = () => {
    setLocation("/membership");
  };

  return (
    <Alert className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950">
      <AlertTriangle className="h-4 w-4 text-orange-600 dark:text-orange-400" />
      <AlertTitle className="text-orange-800 dark:text-orange-200">
        Download limit reached!
      </AlertTitle>
      <AlertDescription className="text-orange-700 dark:text-orange-300">
        <div className="flex items-center justify-between">
          <span>
            You have used all your downloads for this month. Upgrade to Premium to unlock more.
          </span>
          <Button
            onClick={handleUpgradeClick}
            size="sm"
            className="ml-4 bg-orange-600 hover:bg-orange-700 text-white"
          >
            <Crown className="h-4 w-4 mr-2" />
            Upgrade to Premium
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
}
