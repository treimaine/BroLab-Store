import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface SelectOption {
  value: string;
  label: string;
}

interface FormSelectProps {
  readonly label: string;
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly options: SelectOption[];
  readonly placeholder: string;
  readonly error?: string;
  readonly disabled?: boolean;
  readonly required?: boolean;
}

export function FormSelect({
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
  disabled = false,
  required = false,
}: FormSelectProps): JSX.Element {
  return (
    <div>
      <Label className="text-white">
        {label} {required && "*"}
      </Label>
      <Select value={value} onValueChange={onChange} disabled={disabled}>
        <SelectTrigger
          className={`bg-[var(--medium-gray)] border-gray-600 text-white ${
            error ? "border-red-500" : ""
          }`}
        >
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map(option => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      {error && <p className="text-red-400 text-sm mt-1">{error}</p>}
    </div>
  );
}
