/**
 * BroLab Entertainment - Comprehensive Error Handler
 *
 * Provides BroLab-specific error handling with actionable guidance
 */

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  BroLabErrorSeverity,
  createBroLabErrorNotification,
  getBroLabErrorSeverity,
} from "@shared/utils/errorUtils";
import { AlertTriangle, ExternalLink, Home, Mail, RefreshCw } from "lucide-react";

interface BroLabErrorHandlerProps {
  error: Error | string;
  context?: string;
  onRetry?: () => void;
  onDismiss?: () => void;
  showDetails?: boolean;
}

export function BroLabErrorHandler({
  error,
  context,
  onRetry,
  onDismiss: _onDismiss,
  showDetails = false,
}: BroLabErrorHandlerProps) {
  const errorNotification = createBroLabErrorNotification(error, context);
  const severity = getBroLabErrorSeverity(error);

  const handleContactSupport = () => {
    const subject = encodeURIComponent("BroLab Support Request");
    const errorDetails = typeof error === "string" ? error : error.message;
    const body = encodeURIComponent(
      `I need help with a BroLab issue:\n\n` +
        `Error: ${errorDetails}\n` +
        `Context: ${context || "General usage"}\n` +
        `URL: ${window.location.href}\n` +
        `Timestamp: ${new Date().toISOString()}\n\n` +
        `Please describe what you were doing when this occurred:`
    );

    window.open(`mailto:support@brolabentertainment.com?subject=${subject}&body=${body}`);
  };

  const getSeverityColor = () => {
    switch (severity) {
      case BroLabErrorSeverity.CRITICAL:
        return "border-red-500 bg-red-500/10";
      case BroLabErrorSeverity.HIGH:
        return "border-orange-500 bg-orange-500/10";
      case BroLabErrorSeverity.MEDIUM:
        return "border-yellow-500 bg-yellow-500/10";
      default:
        return "border-blue-500 bg-blue-500/10";
    }
  };

  const getSeverityIcon = () => {
    const iconClass = "w-5 h-5";
    switch (severity) {
      case BroLabErrorSeverity.CRITICAL:
        return <AlertTriangle className={`${iconClass} text-red-400`} />;
      case BroLabErrorSeverity.HIGH:
        return <AlertTriangle className={`${iconClass} text-orange-400`} />;
      default:
        return <AlertTriangle className={`${iconClass} text-blue-400`} />;
    }
  };

  return (
    <Card className={`max-w-lg mx-auto ${getSeverityColor()}`}>
      <CardHeader className="text-center pb-4">
        <div className="mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-3 bg-zinc-800/50">
          {getSeverityIcon()}
        </div>
        <CardTitle className="text-white text-lg">{errorNotification.title}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        <Alert className="border-zinc-700 bg-zinc-800/50">
          <AlertDescription className="text-gray-300">{errorNotification.message}</AlertDescription>
        </Alert>

        <div className="text-sm text-gray-400 space-y-2">
          <p>
            <strong>What you can do:</strong> {errorNotification.guidance}
          </p>
          {errorNotification.escalation && (
            <p>
              <strong>Need more help?</strong> {errorNotification.escalation}
            </p>
          )}
        </div>

        {showDetails && typeof error === "object" && (
          <details className="text-xs text-gray-500 bg-zinc-800/30 p-3 rounded">
            <summary className="cursor-pointer mb-2">Technical Details</summary>
            <div className="space-y-1">
              <div>
                <strong>Error:</strong> {error.message}
              </div>
              <div>
                <strong>Context:</strong> {context || "Unknown"}
              </div>
              {error.stack && (
                <div>
                  <strong>Stack:</strong>
                  <pre className="text-xs mt-1 overflow-auto max-h-20 whitespace-pre-wrap">
                    {error.stack}
                  </pre>
                </div>
              )}
            </div>
          </details>
        )}

        <div className="flex flex-col gap-2">
          {onRetry && (
            <Button
              onClick={onRetry}
              className="w-full bg-[var(--color-accent)] hover:bg-[var(--color-accent-alt)]"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              Try Again
            </Button>
          )}

          <div className="flex gap-2">
            <Button
              onClick={handleContactSupport}
              variant="outline"
              className="flex-1 border-zinc-600 text-gray-300 hover:bg-zinc-800"
            >
              <Mail className="w-4 h-4 mr-2" />
              Contact Support
            </Button>

            <Button
              onClick={() => (window.location.href = "/")}
              variant="outline"
              className="flex-1 border-zinc-600 text-gray-300 hover:bg-zinc-800"
            >
              <Home className="w-4 h-4 mr-2" />
              Go Home
            </Button>
          </div>
        </div>

        <div className="pt-3 border-t border-zinc-700 text-center">
          <a
            href="https://status.brolabentertainment.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-gray-400 hover:text-gray-300 inline-flex items-center"
          >
            Check BroLab System Status
            <ExternalLink className="w-3 h-3 ml-1" />
          </a>
        </div>
      </CardContent>
    </Card>
  );
}
