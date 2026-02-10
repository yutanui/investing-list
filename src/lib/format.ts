/**
 * Currency and number formatting utilities.
 *
 * Best practice (web-design-guidelines):
 * - Use Intl.NumberFormat for currency — never hardcode formatting
 * - Use Intl.NumberFormat for numbers with locale-aware separators
 */

import type { Currency } from "@/types/portfolio";

// Fixed exchange rate: 1 USD = 32 THB
export const USD_TO_THB_RATE = 32;

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

/**
 * Convert amount to THB based on currency.
 * If already THB, returns as-is. If USD, converts using fixed rate.
 */
export function toTHB(amount: number, currency: Currency): number {
  return currency === "USD" ? amount * USD_TO_THB_RATE : amount;
}
