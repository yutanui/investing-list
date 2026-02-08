/**
 * Currency and number formatting utilities.
 *
 * Best practice (web-design-guidelines):
 * - Use Intl.NumberFormat for currency — never hardcode formatting
 * - Use Intl.NumberFormat for numbers with locale-aware separators
 */

const thbFormatter = new Intl.NumberFormat("th-TH", {
  style: "currency",
  currency: "THB",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const percentFormatter = new Intl.NumberFormat("th-TH", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  signDisplay: "exceptZero",
});

const percentFormatterNoSign = new Intl.NumberFormat("th-TH", {
  style: "percent",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatTHB(amount: number): string {
  return thbFormatter.format(amount);
}

export function formatPercent(ratio: number): string {
  return percentFormatter.format(ratio);
}

export function formatAllocation(ratio: number): string {
  return percentFormatterNoSign.format(ratio);
}
