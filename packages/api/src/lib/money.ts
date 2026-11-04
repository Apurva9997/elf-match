const CURRENCIES = [
  "USD",
  "EUR",
  "GBP",
  "INR",
  "CAD",
  "AUD",
  "SGD",
  "AED",
  "JPY",
  "CHF",
  "NZD",
  "ZAR",
  "BRL",
  "MXN",
  "SEK",
  "NOK",
  "DKK",
  "HKD",
  "KRW",
  "THB",
  "MYR",
  "PHP",
  "IDR",
  "PLN",
  "TRY",
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number];

const CODES = new Set<string>(CURRENCIES);

export function currencyCode(value: string | null | undefined): CurrencyCode {
  const code = (value || "").toUpperCase();
  return CODES.has(code) ? (code as CurrencyCode) : "USD";
}

export function formatMoney(
  amount: string | number,
  currency: string | null | undefined
): string {
  const value = Number(amount);
  const code = currencyCode(currency);
  if (!Number.isFinite(value)) return String(amount);
  return new Intl.NumberFormat("en", {
    style: "currency",
    currency: code,
    maximumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

export function budgetRange(
  min: string | number | null | undefined,
  max: string | number | null | undefined,
  currency: string | null | undefined
): string | null {
  if (min == null || min === "" || max == null || max === "") return null;
  return `${formatMoney(min, currency)} – ${formatMoney(max, currency)}`;
}
