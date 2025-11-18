import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/convex-api";
import { useMutation } from "convex/react";
import { AlertCircle, CheckCircle, RefreshCw } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

/**
 * Result type for the regenerateDownloadsFromOrders mutation
 * Matches the return type from convex/orders.ts
 */
interface RegenerateDownloadsResult {
  success: boolean;
  created: number;
  skipped: number;
  ordersProcessed: number;
}

interface DownloadsRegeneratorProps {
  readonly onRegenerateComplete?: () => void;
  readonly className?: string;
}

/**
 * DownloadsRegenerator Component
 *
 * Provides a UI for users to regenerate download access from their paid orders.
 * This is useful when downloads are missing or out of sync with order history.
 *
 * Features:
 * - Scans all paid orders for the current user
 * - Creates download access for purchased beats
 * - Skips downloads that already exist
 * - Updates activity log with new downloads
 * - Shows detailed results after regeneration
 *
 * Requirements addressed:
 * - Download quota validation before granting downloads
 * - Data access control (users access only their own data)
 * - Proper error handling with user-friendly messages
 */
export function DownloadsRegenerator({
  onRegenerateComplete,
  className,
}: DownloadsRegeneratorProps): JSX.Element {
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [lastResult, setLastResult] = useState<RegenerateDownloadsResult | null>(null);

  // Using 'as never' to bypass deep type instantiation issues with Convex
  const regenerateDownloads = useMutation(api.orders.regenerateDownloadsFromOrders as never);

  const handleRegenerate = async (): Promise<void> => {
    try {
      setIsRegenerating(true);

      // Call the Convex mutation to regenerate downloads
      const result = (await regenerateDownloads({})) as RegenerateDownloadsResult;

      setLastResult(result);

      if (result.created > 0) {
        toast.success(
          `✅ Downloads regenerated successfully! ${result.created} new downloads created from ${result.ordersProcessed} paid orders.`
        );
      } else {
        toast.info(
          `ℹ️ No new downloads needed. All ${result.skipped} downloads from ${result.ordersProcessed} paid orders already exist.`
        );
      }

      // Call callback to refresh dashboard data
      onRegenerateComplete?.();
    } catch (error) {
      console.error("Failed to regenerate downloads:", error);
      toast.error(
        `❌ Failed to regenerate downloads: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <Card className={`bg-gray-900/50 border-gray-700/50 backdrop-blur-sm ${className}`}>
      <CardHeader className="p-4 sm:p-6">
        <CardTitle className="flex items-center space-x-2 text-white text-sm sm:text-base">
          <RefreshCw className="h-4 w-4 sm:h-5 sm:w-5" />
          <span>Fix Downloads</span>
        </CardTitle>
        <CardDescription className="text-gray-400 text-xs sm:text-sm">
          If your downloads don&apos;t match your purchases, regenerate them from your paid orders.
        </CardDescription>
      </CardHeader>
      <CardContent className="p-4 sm:p-6 space-y-4">
        {lastResult && (
          <div className="bg-gray-800/50 rounded-lg p-3 space-y-2">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 text-green-500" />
              <span className="text-sm font-medium text-white">Last Regeneration Results</span>
            </div>
            <div className="text-xs text-gray-300 space-y-1">
              <div>• {lastResult.ordersProcessed} paid orders processed</div>
              <div>• {lastResult.created} new downloads created</div>
              <div>• {lastResult.skipped} downloads already existed</div>
            </div>
          </div>
        )}

        <div className="bg-blue-900/20 border border-blue-700/30 rounded-lg p-3">
          <div className="flex items-start space-x-2">
            <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">What this does:</p>
              <ul className="space-y-1 text-blue-200">
                <li>• Scans all your paid orders</li>
                <li>• Creates download access for purchased beats</li>
                <li>• Skips downloads that already exist</li>
                <li>• Updates your activity log</li>
              </ul>
            </div>
          </div>
        </div>

        <Button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="w-full bg-purple-600 hover:bg-purple-700 text-white"
          size="sm"
        >
          {isRegenerating ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              Regenerating Downloads...
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              Regenerate Downloads from Orders
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

export default DownloadsRegenerator;
