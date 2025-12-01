interface CustomTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
}

const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(value);
};

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat("fr-FR").format(value);
};

export function CustomTooltip({
  active,
  payload,
  label,
}: Readonly<CustomTooltipProps>): JSX.Element | null {
  if (active && payload?.length) {
    return (
      <div className="bg-gray-900/95 border border-gray-700 rounded-lg p-3 shadow-xl backdrop-blur-sm">
        <p className="text-gray-300 text-sm mb-2">{label}</p>
        {payload.map((entry: { name: string; value: number; color: string }) => (
          <p key={entry.name} className="text-sm" style={{ color: entry.color }}>
            {entry.name}:{" "}
            {entry.name.includes("€") ? formatCurrency(entry.value) : formatNumber(entry.value)}
          </p>
        ))}
      </div>
    );
  }
  return null;
}
