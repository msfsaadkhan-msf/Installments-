const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const isValidDate = (d: Date) => d instanceof Date && !isNaN(d.getTime());

const FULL_MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/**
 * Format date as "18 May 2026"
 */
export function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (!isValidDate(d)) return 'N/A';
  return `${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Format date as "May 18, 2026"
 */
export function formatDateLong(dateStr: string): string {
  const d = new Date(dateStr);
  if (!isValidDate(d)) return 'N/A';
  return `${FULL_MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

/**
 * Format date as "18/05/2026"
 */
export function formatDateSlash(dateStr: string): string {
  if (!dateStr) return 'N/A';
  const d = new Date(dateStr);
  if (!isValidDate(d)) return 'N/A';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${d.getFullYear()}`;
}

/**
 * Get today's date as ISO string
 */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

/**
 * Get greeting based on current time
 */
export function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good Morning';
  if (hour < 17) return 'Good Afternoon';
  return 'Good Evening';
}

/**
 * Check if a date is overdue (before today)
 */
export function isOverdue(dateStr: string): boolean {
  const due = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return due < today;
}

/**
 * Get next month date from a given date
 */
export function addMonths(dateStr: string, months: number): string {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  if (!isValidDate(d)) return '';
  d.setMonth(d.getMonth() + (isNaN(months) ? 0 : months));
  try {
    return d.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

/**
 * Get difference in months between two dates
 */
export function diffMonths(startStr: string, endStr: string): number {
  if (!startStr || !endStr) return 0;
  const start = new Date(startStr);
  const end = new Date(endStr);
  if (!isValidDate(start) || !isValidDate(end)) return 0;
  
  let months = (end.getFullYear() - start.getFullYear()) * 12;
  months += end.getMonth() - start.getMonth();
  
  // If the end day is less than the start day, subtract one month
  if (end.getDate() < start.getDate()) {
    months--;
  }
  
  return months > 0 ? months : 0;
}

/**
 * Generate unique ID
 */
export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}
