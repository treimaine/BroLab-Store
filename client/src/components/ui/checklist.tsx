import { Check, CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

interface ChecklistItem {
  text: string;
  checked?: boolean;
}

interface ChecklistProps {
  items: (string | ChecklistItem)[];
  icon?: "check" | "check-circle";
  className?: string;
  itemClassName?: string;
}

export function Checklist({
  items,
  icon = "check",
  className,
  itemClassName,
}: ChecklistProps) {
  const IconComponent = icon === "check-circle" ? CheckCircle : Check;

  return (
    <ul className={cn("space-y-3", className)}>
      {items.map((item, index) => {
        const itemText = typeof item === "string" ? item : item.text;
        const isChecked = typeof item === "string" ? true : item.checked !== false;
        
        return (
          <li
            key={index}
            className={cn(
              "flex items-start gap-3 text-gray-300",
              !isChecked && "opacity-50",
              itemClassName
            )}
          >
            <IconComponent
              className={cn(
                "w-5 h-5 mt-0.5 flex-shrink-0 text-[var(--color-accent)]",
                !isChecked && "text-gray-500"
              )}
            />
            <span className="leading-relaxed">{itemText}</span>
          </li>
        );
      })}
    </ul>
  );
}