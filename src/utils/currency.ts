/**
 * Format a number as PKR currency string
 * e.g. 25000 → "₨ 25,000"
 */
export function formatPKR(amount: number): string {
  const formatted = amount.toLocaleString('en-PK', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  });
  return `₨ ${formatted}`;
}

/**
 * Format a number as PKR with decimal places
 * e.g. 25000.50 → "₨ 25,000.50"
 */
export function formatPKRDecimal(amount: number): string {
  const formatted = amount.toLocaleString('en-PK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  return `₨ ${formatted}`;
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
