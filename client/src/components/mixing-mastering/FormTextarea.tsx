import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

interface FormTextareaProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onBlur: () => void;
  readonly error?: string;
  readonly placeholder: string;
  readonly required?: boolean;
  readonly disabled?: boolean;
  readonly rows?: number;
  readonly maxLength?: number;
}

export function FormTextarea({
  label,
  value,
  onChange,
  onBlur,
  error,
  placeholder,
  required = false,
  disabled = false,
  rows = 4,
  maxLength,
}: FormTextareaProps): JSX.Element {
  return (
    <div>
      <Label className="text-white">
        {label} {required && "*"}
      </Label>
      <Textarea
        required={required}
        value={value}
        onChange={e => onChange(e.target.value)}
        onBlur={onBlur}
        className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
          error ? "border-red-500" : ""
        }`}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
      />
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
      {maxLength && (
        <p className="text-gray-500 text-xs mt-1">
          {value.length}/{maxLength} characters
        </p>
      )}
    </div>
  );
}
