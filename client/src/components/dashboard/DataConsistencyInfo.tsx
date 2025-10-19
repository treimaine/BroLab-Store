import { Card, CardContent } from "@/components/ui/card";
import { motion } from "framer-motion";
import { Info, RefreshCw } from "lucide-react";
import { memo } from "react";

interface DataConsistencyInfoProps {
  isVisible: boolean;
  onDismiss: () => void;
}

export const DataConsistencyInfo = memo<DataConsistencyInfoProps>(({ isVisible, onDismiss }) => {
  if (!isVisible) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="mb-4"
    >
      <Card className="bg-blue-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="flex items-start space-x-3">
            <Info className="w-5 h-5 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="flex-1">
              <h4 className="text-sm font-medium text-blue-300 mb-1">Data Synchronization</h4>
              <p className="text-xs text-blue-200/80 mb-3">
                Dashboard sections now use unified real-time data synchronization. All statistics
                are calculated from the same source to ensure accuracy and consistency.
              </p>
              <div className="flex items-center space-x-2">
                <RefreshCw className="w-3 h-3 text-blue-400" />
                <span className="text-xs text-blue-300">
                  Data is automatically synchronized every 30 seconds
                </span>
              </div>
            </div>
            <button
              onClick={onDismiss}
              className="text-blue-400 hover:text-blue-300 transition-colors"
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

DataConsistencyInfo.displayName = "DataConsistencyInfo";

export default DataConsistencyInfo;
