import { Badge } from "@/components/ui/badge";
import { CheckCircle, Clock, XCircle } from "lucide-react";

interface TableColumn {
  key: string;
  label: string;
  type?: "text" | "number" | "currency" | "date" | "status";
  sortable?: boolean;
  render?: (value: unknown, row: Record<string, unknown>) => React.ReactNode;
}

interface TableData {
  [key: string]: unknown;
}

const isValidValue = (val: unknown): val is string | number | boolean => {
  return typeof val === "string" || typeof val === "number" || typeof val === "boolean";
};

export function renderCurrencyCell(value: unknown): JSX.Element {
  if (typeof value === "number") {
    return <span className="font-medium text-green-600">{value.toFixed(2)}</span>;
  }
  const stringValue = isValidValue(value) ? String(value) : "";
  return <span className="font-medium text-green-600">{stringValue}</span>;
}

export function renderDateCell(value: unknown): JSX.Element {
  const dateValue =
    typeof value === "string" || typeof value === "number" || value instanceof Date ? value : null;
  return (
    <span className="text-sm text-muted-foreground">
      {dateValue ? new Date(dateValue).toLocaleDateString("fr-FR") : "-"}
    </span>
  );
}

export function renderStatusCell(value: unknown): JSX.Element {
  const statusValue = isValidValue(value) ? String(value) : "";
  let variant: "default" | "secondary" | "destructive" = "destructive";
  if (statusValue === "completed") {
    variant = "default";
  } else if (statusValue === "pending") {
    variant = "secondary";
  }

  return (
    <Badge variant={variant} className="capitalize">
      {statusValue === "completed" && <CheckCircle className="w-3 h-3 mr-1" />}
      {statusValue === "pending" && <Clock className="w-3 h-3 mr-1" />}
      {statusValue === "failed" && <XCircle className="w-3 h-3 mr-1" />}
      {statusValue}
    </Badge>
  );
}

export function renderDefaultCell(value: unknown): JSX.Element {
  const displayValue = isValidValue(value) ? String(value) : "";
  return <span>{displayValue}</span>;
}

export function renderCell(column: TableColumn, value: unknown, row: TableData): React.ReactNode {
  if (column.render) {
    return column.render(value, row);
  }

  switch (column.type) {
    case "currency":
      return renderCurrencyCell(value);
    case "date":
      return renderDateCell(value);
    case "status":
      return renderStatusCell(value);
    default:
      return renderDefaultCell(value);
  }
}
