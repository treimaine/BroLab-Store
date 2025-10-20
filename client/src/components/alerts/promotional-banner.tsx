import { useState } from 'react';
import { X, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'wouter';

export function PromotionalBanner() {
  const [isVisible, setIsVisible] = useState(true);

  if (!isVisible) return null;

  return (
    <div className="bg-gradient-to-r from-[var(--accent-purple)] to-purple-600 text-white py-3 px-4 relative">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Tag className="w-5 h-5" />
          <span className="font-semibold">
            🔥 Limited Time: Spend $100+ and get 20% off your entire order!
          </span>
        </div>
        
        <div className="flex items-center gap-4">
          <Link href="/shop">
            <Button variant="secondary" size="sm" className="bg-white text-purple-600 hover:bg-gray-100">
              Shop Now
            </Button>
          </Link>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="text-white hover:text-gray-200 p-1"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}