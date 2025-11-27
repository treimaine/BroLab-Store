import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { CheckCircle, Loader2 } from "lucide-react";
import type { ReactNode } from "react";

interface FormFieldProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly error?: string;
  readonly placeholder: string;
  readonly type?: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly icon?: ReactNode;
  readonly isLoading?: boolean;
  readonly isAutoFilled?: boolean;
  readonly min?: string;
  readonly max?: string;
}

export function FormField({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  type = "text",
  required = false,
  disabled = false,
  icon,
  isLoading = false,
  isAutoFilled = false,
  min,
  max,
}: FormFieldProps): JSX.Element {
  const getInputClassName = (): string => {
    const baseClass = `${icon ? "pl-10" : ""} ${isLoading ? "pr-10" : ""} bg-[var(--medium-gray)] border-gray-600 text-white`;
    const errorClass = error ? "border-red-500" : "";
    const successClass = isAutoFilled && !error ? "border-green-500/50 bg-green-900/10" : "";
    return `${baseClass} ${errorClass} ${successClass}`;
  };

  return (
    <div>
      <Label className="text-white flex items-center gap-2">
        {label}
        {isLoading && <Loader2 className="w-3 h-3 animate-spin text-blue-400" />}
        {isAutoFilled && !isLoading && (
          <div className="flex items-center gap-1">
            <CheckCircle className="w-3 h-3 text-green-400" />
            <span className="text-green-400 text-xs">Auto-filled</span>
          </div>
        )}
      </Label>
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">
            {icon}
          </div>
        )}
        {isLoading && (
          <Loader2 className="absolute right-3 top-1/2 transform -translate-y-1/2 text-blue-400 w-4 h-4 animate-spin" />
        )}
        <Input
          type={type}
          required={required}
          value={value}
          onChange={e => onChange(e.target.value)}
          onBlur={onBlur}
          className={getInputClassName()}
          placeholder={placeholder}
          disabled={disabled}
          min={min}
          max={max}
        />
      </div>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}
