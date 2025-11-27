import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Clock } from "lucide-react";

interface Service {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
}

interface ServiceCardProps {
  readonly service: Service;
  readonly isSelected: boolean;
  readonly onSelect: () => void;
}

export function ServiceCard({ service, isSelected, onSelect }: ServiceCardProps) {
  return (
    <Card
      className={`cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-xl relative ${
        isSelected
          ? "card-dark ring-2 ring-[var(--accent-purple)] shadow-lg shadow-purple-500/20"
          : "card-dark hover:ring-1 hover:ring-gray-500/50"
      }`}
      onClick={onSelect}
    >
      {isSelected && (
        <div className="absolute -top-2 -right-2 w-6 h-6 bg-[var(--accent-purple)] rounded-full flex items-center justify-center">
          <CheckCircle className="w-4 h-4 text-white" />
        </div>
      )}
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl text-white flex items-center gap-2">
            {service.name}
            {service.id === "mixing-mastering" && (
              <Badge variant="secondary" className="bg-green-600 text-white text-xs">
                Best Value
              </Badge>
            )}
          </CardTitle>
          <Badge className="bg-[var(--accent-purple)] text-white font-semibold">
            ${service.price}
          </Badge>
        </div>
        <div className="flex items-center text-gray-400 text-sm">
          <Clock className="w-4 h-4 mr-1" />
          {service.duration}
        </div>
      </CardHeader>
      <CardContent>
        <p className="text-gray-300 mb-4">{service.description}</p>
        <ul className="space-y-2">
          {service.features.map(feature => (
            <li key={feature} className="flex items-center text-sm text-gray-300">
              <CheckCircle className="w-4 h-4 text-green-500 mr-2 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
