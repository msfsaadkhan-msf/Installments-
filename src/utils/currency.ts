/**
 * Format a number as currency string based on selected currency
 * e.g. (25000, "PKR (₨)") → "₨ 25,000"
 */
export function formatCurrency(amount: number, currency: string = 'PKR (₨)'): string {
  const symbol = currency.match(/\((.*)\)/)?.[1] || '₨';
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `${symbol} ${formatted}`;
}

/**
 * Format a number as currency with decimal places
 */
export function formatCurrencyDecimal(amount: number, currency: string = 'PKR (₨)'): string {
  const symbol = currency.match(/\((.*)\)/)?.[1] || '₨';
  const formatted = amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `${symbol} ${formatted}`;
}

/**
 * Calculate monthly installment
 */
export function calcMonthlyInstallment(
  totalAmount: number,
  downPayment: number,
  tenure: number
): number {
  const financed = totalAmount - downPayment;
  if (tenure <= 0) return 0;
  return Math.ceil(financed / tenure);
}

/**
 * Calculate total remaining
 */
export function calcRemaining(totalAmount: number, downPayment: number, paidAmount: number): number {
  return totalAmount - downPayment - paidAmount;
}

/**
 * Calculate progress percentage
 */
export function calcProgress(paid: number, total: number): number {
  if (total <= 0) return 0;
  return Math.min((paid / total) * 100, 100);
}
