export function formatCurrencyUSD(valueInCents: number | null | undefined): string {
  const cents = typeof valueInCents === "number" ? valueInCents : 0;
  const dollars = cents / 100;
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  }).format(dollars);
}
