import { CheckCircle } from "lucide-react";

interface ProgressIndicatorProps {
  readonly selectedServiceName?: string;
  readonly selectedServicePrice?: number;
}

export function ProgressIndicator({
  selectedServiceName,
  selectedServicePrice,
}: ProgressIndicatorProps) {
  return (
    <div className="mb-8 max-w-4xl mx-auto">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--accent-purple)] text-white rounded-full flex items-center justify-center font-semibold">
            <CheckCircle className="w-5 h-5" />
          </div>
          <span className="text-white font-medium">Choose Service</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-600 mx-4">
          <div className="h-full bg-[var(--accent-purple)] w-full transition-all duration-500" />
        </div>
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-[var(--accent-purple)] text-white rounded-full flex items-center justify-center font-semibold">
            2
          </div>
          <span className="text-white font-medium">Book Session</span>
        </div>
        <div className="flex-1 h-0.5 bg-gray-600 mx-4" />
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-gray-600 text-gray-400 rounded-full flex items-center justify-center font-semibold">
            3
          </div>
          <span className="text-gray-400">Checkout</span>
        </div>
      </div>
      <div className="mt-3 text-center">
        <p className="text-sm text-gray-400">
          Selected:{" "}
          <span className="text-[var(--accent-purple)] font-medium">{selectedServiceName}</span> -{" "}
          <span className="text-white font-medium">${selectedServicePrice}</span>
        </p>
      </div>
    </div>
  );
}
