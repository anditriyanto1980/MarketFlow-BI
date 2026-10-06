import { Timestamp } from 'firebase/firestore';

/**
 * Indonesian Locale Date Utilities (Timezone: Asia/Jakarta - WIB)
 */
export function toJsDate(dateInput: Date | Timestamp | string | number | null | undefined): Date {
  if (!dateInput) return new Date();
  if (dateInput instanceof Date) return dateInput;
  if (dateInput instanceof Timestamp) return dateInput.toDate();
  if (typeof dateInput === 'string' || typeof dateInput === 'number') {
    return new Date(dateInput);
  }
  return new Date();
}

export function formatDate(
  dateInput: Date | Timestamp | string | number | null | undefined,
  locale: string = 'id-ID'
): string {
  const d = toJsDate(dateInput);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

export function formatDateTime(
  dateInput: Date | Timestamp | string | number | null | undefined,
  locale: string = 'id-ID'
): string {
  const d = toJsDate(dateInput);
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Jakarta',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(d);
}
