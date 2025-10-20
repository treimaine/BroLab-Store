import { useState } from 'react';
import { X, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DiscountBannerProps {
  onClose?: () => void;
}

export function DiscountBanner({ onClose }: DiscountBannerProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  const handleClose = () => {
    setIsVisible(false);
    onClose?.();
  };

  return (
    <div className="discount-banner relative text-black py-3 px-4 z-50">
      <div className="flex items-center justify-center space-x-4">
        <Zap className="w-5 h-5 animate-pulse" />
        <div className="flex items-center space-x-2 text-sm font-bold">
          <Clock className="w-4 h-4" />
          <span>LIMITED TIME: Save 50% on all beats with code BROLAB50</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleClose}
          className="text-black hover:bg-black/10 p-1 h-auto"
          aria-label="Close discount banner"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}