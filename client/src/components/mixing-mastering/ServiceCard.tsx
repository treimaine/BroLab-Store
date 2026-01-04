import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock, Sparkles } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
  originalPrice?: number;
  duration: string;
  description: string;
  bestFor: string;
  outcome: string;
  features: string[];
}

interface ServiceCardProps {
  readonly service: Service;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

export function ServiceCard({ service, isSelected, onSelect }: ServiceCardProps): JSX.Element {
  const hasDiscount = service.originalPrice !== undefined && service.originalPrice > service.price;
  const savingsAmount =
    hasDiscount && service.originalPrice ? service.originalPrice - service.price : 0;

  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:scale-[1.02] hover:shadow-xl relative ${
        isSelected
          ? "card-dark ring-2 ring-[var(--accent-purple)] shadow-lg shadow-purple-500/20"
          : "card-dark hover:ring-1 hover:ring-gray-500/50"
      }`}
      onClick={onSelect}
    >
      {/* Selection indicator */}
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent-purple)] rounded-full flex items-center justify-center z-10">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}

      {/* Best Value badge for bundle */}
      {service.id === "mixing-mastering" && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 z-10">
          <Badge className="bg-green-600 text-white text-xs px-3 py-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            Best Value
            {hasDiscount && ` · Save $${savingsAmount}`}
          </Badge>
        </div>
      )}

      <CardHeader className={service.id === "mixing-mastering" ? "pt-6" : ""}>
        {/* Title + Price */}
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg sm:text-xl text-white leading-tight">
            {service.name}
          </CardTitle>
          <div className="flex flex-col items-end">
            <Badge className="bg-[var(--accent-purple)] text-white font-bold text-base px-3">
              ${service.price}
            </Badge>
            {hasDiscount && (
              <span className="text-xs text-gray-500 line-through mt-1">
                ${service.originalPrice}
              </span>
            )}
          </div>
        </div>

        {/* Duration */}
        <div className="flex items-center text-gray-400 text-sm mt-2">
          <Clock className="w-4 h-4 mr-1.5 flex-shrink-0" />
          {service.duration}
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Best For */}
        <div className="bg-gray-800/50 rounded-lg p-3">
          <p className="text-xs text-gray-400 uppercase tracking-wide mb-1">Best for</p>
          <p className="text-sm text-white">{service.bestFor}</p>
        </div>

        {/* Outcome */}
        <div className="bg-[var(--accent-purple)]/10 rounded-lg p-3 border border-[var(--accent-purple)]/20">
          <p className="text-xs text-[var(--accent-purple)] uppercase tracking-wide mb-1">
            You get
          </p>
          <p className="text-sm text-white font-medium">{service.outcome}</p>
        </div>

        {/* Features (max 4 visible) */}
        <ul className="space-y-2">
          {service.features.slice(0, 4).map(feature => (
            <li key={feature} className="flex items-start text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0 mt-0.5" />
              <span>{feature}</span>
            </li>
          ))}
        </ul>

        {/* "See more" hint if more features */}
        {service.features.length > 4 && (
          <p className="text-xs text-gray-500 text-center">
            +{service.features.length - 4} more included
          </p>
        )}
      </CardContent>
    </Card>
  );
}
