import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Major currencies with 6 decimal places
const MAJOR_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

// Minor currencies with 2 decimal places (typically African and developing market currencies)
const MINOR_CURRENCIES = ['UGX', 'KES', 'NGN', 'EGP', 'MAD', 'TZS', 'GHS', 'RWF', 'ZAR', 'INR'];

export function getCurrencyPrecision(currency: string): number {
  if (MAJOR_CURRENCIES.includes(currency.toUpperCase())) {
    return 6;
  } else if (MINOR_CURRENCIES.includes(currency.toUpperCase())) {
    return 2;
  }
  // Default to 2 for unknown currencies
  return 2;
}

export function formatAmount(amount: string | number, currency?: string, options?: { 
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return currency ? `0.${'0'.repeat(getCurrencyPrecision(currency || ''))} ${currency}` : '0.00';
  
  // Use currency-specific precision if not overridden by options
  const precision = currency ? getCurrencyPrecision(currency) : 2;
  
  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? precision,
    maximumFractionDigits: options?.maximumFractionDigits ?? precision,
  });
  
  return currency ? `${formatted} ${currency}` : formatted;
}

export function formatCurrency(amount: string | number, currency: string): string {
  return formatAmount(amount, currency);
}

export function formatRate(rate: string | number): string {
  const numericRate = typeof rate === 'string' ? parseFloat(rate) : rate;
  
  if (isNaN(numericRate)) return '0.000000';
  
  return numericRate.toLocaleString('en-US', {
    minimumFractionDigits: 6,
    maximumFractionDigits: 6,
  });
}
