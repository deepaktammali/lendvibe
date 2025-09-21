import { type ClassValue, clsx } from 'clsx'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { twMerge } from 'tailwind-merge'

dayjs.extend(relativeTime)

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export type DateFormat =
  | 'short' // 12 Jan 2024
  | 'medium' // 12 January 2024
  | 'long' // Friday, 12 January 2024
  | 'numeric' // 12/01/2024
  | 'iso' // 2024-01-12
  | 'relative' // 2 days ago, in 3 days
  | 'time' // 2:30 PM
  | 'datetime' // 12 Jan 2024, 2:30 PM

/**
 * Format a date with context-aware formatting using dayjs
 */
export function formatDate(
  date: Date | string | null | undefined,
  format: DateFormat = 'short'
): string {
  if (!date) return '-'

  const d = dayjs(date)

  if (!d.isValid()) return 'Invalid Date'

  switch (format) {
    case 'short':
      return d.format('DD MMM YYYY')
    case 'medium':
      return d.format('DD MMMM YYYY')
    case 'long':
      return d.format('dddd, DD MMMM YYYY')
    case 'numeric':
      return d.format('DD/MM/YYYY')
    case 'iso':
      return d.format('YYYY-MM-DD')
    case 'relative':
      return d.fromNow()
    case 'time':
      return d.format('h:mm A')
    case 'datetime':
      return d.format('DD MMM YYYY, h:mm A')
    default:
      return d.format('DD MMM YYYY')
  }
}

/**
 * Parse a date string back to Date object
 */
export function parseDate(dateString: string): Date {
  return dayjs(dateString).toDate()
}

/**
 * Check if a date is overdue (past today)
 */
export function isOverdue(date: Date | string): boolean {
  return dayjs(date).isBefore(dayjs(), 'day')
}

/**
 * Get days between two dates
 */
export function daysBetween(startDate: Date | string, endDate: Date | string): number {
  return dayjs(endDate).diff(dayjs(startDate), 'day')
}

/**
 * Get current date in ISO format (YYYY-MM-DD) for form inputs
 */
export function getCurrentDateISO(): string {
  return dayjs().format('YYYY-MM-DD')
}

/**
 * Get current date in ISO format for comparisons
 */
export function getCurrentDateISOString(): string {
  return dayjs().toISOString()
}

/**
 * Get current month in YYYY-MM format
 */
export function getCurrentMonth(): string {
  return dayjs().format('YYYY-MM')
}
