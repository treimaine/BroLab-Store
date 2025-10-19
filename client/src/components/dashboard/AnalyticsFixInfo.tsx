import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { CheckCircle, Database, TrendingUp } from "lucide-react";
import { memo } from "react";

interface AnalyticsFixInfoProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const AnalyticsFixInfo = memo<AnalyticsFixInfoProps>(({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4"
    >
      <Card className="bg-green-900/20 border-green-500/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <CheckCircle className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-green-300 mb-1">Analytics Data Fixed! 🎉</h4>
              <p className="text-xs text-green-200/80 mb-3">
                Analytics data is now synchronized with your dashboard statistics. All sections
                display consistent real-time data from your account.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-3">
                <div className="flex items-center space-x-2">
                  <Database className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-300">Real database totals</span>
                </div>
                <div className="flex items-center space-x-2">
                  <TrendingUp className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-300">Accurate analytics</span>
                </div>
              </div>
              <p className="text-xs text-green-200/60">
                Problem: Analytics was using paginated data instead of real totals. Solution: Now
                counts all records directly from database.
              </p>
            </div>
            <button
              onClick={onDismiss}
              className="text-green-400 hover:text-green-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
});

AnalyticsFixInfo.displayName = "AnalyticsFixInfo";

export default AnalyticsFixInfo;
