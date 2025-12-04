import { AlertTriangle, RefreshCw, Settings, Wrench } from "lucide-react";

interface EnvConfigErrorProps {
  readonly missingVars: readonly string[];
  readonly isDev?: boolean;
}

/**
 * Graceful error component displayed when critical environment variables are missing.
 * Shows a maintenance-style page instead of crashing the app with a white screen.
 */
export function EnvConfigError({ missingVars, isDev = false }: EnvConfigErrorProps): JSX.Element {
  const handleRefresh = (): void => {
    globalThis.location.reload();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-zinc-900/80 backdrop-blur-sm border border-zinc-800 rounded-2xl shadow-2xl overflow-hidden">
        {/* Header with icon */}
        <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 p-6 text-center border-b border-zinc-800">
          <div className="mx-auto w-20 h-20 bg-amber-500/20 rounded-full flex items-center justify-center mb-4 ring-4 ring-amber-500/10">
            <Wrench className="w-10 h-10 text-amber-400" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Configuration Required</h1>
          <p className="text-amber-200/80 text-sm">
            BroLab is being set up. Please wait while we configure the system.
          </p>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          <div className="flex items-start gap-3 p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/50">
            <AlertTriangle className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-gray-300 text-sm">
                The application is missing some required configuration. This is usually a temporary
                issue during deployment or setup.
              </p>
              <p className="text-gray-400 text-xs">
                If you&apos;re a visitor, please try again in a few minutes.
              </p>
            </div>
          </div>

          {/* Dev mode: show missing vars */}
          {isDev && missingVars.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <Settings className="w-4 h-4" />
                <span>Missing Environment Variables:</span>
              </div>
              <ul className="bg-zinc-800 rounded-lg p-3 space-y-1">
                {missingVars.map(varName => (
                  <li key={varName} className="flex items-center gap-2 text-sm">
                    <span className="w-2 h-2 bg-red-400 rounded-full" />
                    <code className="text-red-300 font-mono text-xs">{varName}</code>
                  </li>
                ))}
              </ul>
              <p className="text-xs text-gray-500">
                Add these variables to your <code className="text-amber-400">.env.local</code> file.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex flex-col gap-3">
            <button
              onClick={handleRefresh}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold rounded-lg transition-all duration-200 shadow-lg shadow-amber-500/20"
            >
              <RefreshCw className="w-4 h-4" />
              Refresh Page
            </button>

            <a
              href="https://brolabentertainment.com"
              className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-zinc-800 hover:bg-zinc-700 text-gray-300 font-medium rounded-lg transition-colors border border-zinc-700"
            >
              Visit Main Website
            </a>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-zinc-800/30 border-t border-zinc-800 text-center">
          <p className="text-xs text-gray-500">
            BroLab Entertainment &bull; Professional Beats Marketplace
          </p>
        </div>
      </div>
    </div>
  );
}
