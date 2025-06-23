import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatAmount(amount: string | number, currency?: string, options?: { 
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
}): string {
  const numericAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
  
  if (isNaN(numericAmount)) return '0.00';
  
  const formatted = numericAmount.toLocaleString('en-US', {
    minimumFractionDigits: options?.minimumFractionDigits ?? 2,
    maximumFractionDigits: options?.maximumFractionDigits ?? 2,
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
