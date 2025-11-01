import { Card, CardContent } from "@/components/ui/card";
import { PRIORITY_CONFIG, type PriorityLevel } from "./CustomBeatRequestConstants";

// Priority Card Component
interface PriorityCardProps {
  readonly priority: PriorityLevel;
  readonly isSelected: boolean;
  readonly onSelect: (priority: PriorityLevel) => void;
}

export function PriorityCard({ priority, isSelected, onSelect }: PriorityCardProps) {
  const config = PRIORITY_CONFIG[priority];
  const Icon = config.icon;

  return (
    <Card
      className={`cursor-pointer transition-all ${
        isSelected
          ? "border-[var(--accent-purple)] bg-[var(--accent-purple)]/10"
          : "border-[var(--medium-gray)] hover:border-[var(--accent-purple)]/50"
      }`}
      onClick={() => onSelect(priority)}
    >
      <CardContent className="p-4 text-center">
        <div className="flex items-center justify-center mb-2">
          <Icon className={`w-5 h-5 ${config.iconColor}`} />
        </div>
        <h4 className="font-medium text-white capitalize">{priority}</h4>
        <p className="text-xs text-gray-400 mt-1">{config.delivery}</p>
        <p className="text-sm font-bold text-[var(--accent-purple)] mt-2">+${config.fee}</p>
      </CardContent>
    </Card>
  );
}
