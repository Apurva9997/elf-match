export const CURRENCIES = [
  { code: "USD", label: "US dollar" },
  { code: "EUR", label: "Euro" },
  { code: "GBP", label: "British pound" },
  { code: "INR", label: "Indian rupee" },
  { code: "CAD", label: "Canadian dollar" },
  { code: "AUD", label: "Australian dollar" },
  { code: "SGD", label: "Singapore dollar" },
  { code: "AED", label: "UAE dirham" },
  { code: "JPY", label: "Japanese yen" },
  { code: "CHF", label: "Swiss franc" },
  { code: "NZD", label: "New Zealand dollar" },
  { code: "ZAR", label: "South African rand" },
  { code: "BRL", label: "Brazilian real" },
  { code: "MXN", label: "Mexican peso" },
  { code: "SEK", label: "Swedish krona" },
  { code: "NOK", label: "Norwegian krone" },
  { code: "DKK", label: "Danish krone" },
  { code: "HKD", label: "Hong Kong dollar" },
  { code: "KRW", label: "South Korean won" },
  { code: "THB", label: "Thai baht" },
  { code: "MYR", label: "Malaysian ringgit" },
  { code: "PHP", label: "Philippine peso" },
  { code: "IDR", label: "Indonesian rupiah" },
  { code: "PLN", label: "Polish zloty" },
  { code: "TRY", label: "Turkish lira" },
] as const;

export type CurrencyCode = (typeof CURRENCIES)[number]["code"];

const CODES = new Set<string>(CURRENCIES.map((currency) => currency.code));

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
