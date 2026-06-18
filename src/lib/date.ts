import { format } from 'date-fns';

/**
 * Safely formats a date value without throwing RangeError for invalid time values.
 * Returns fallback if the date value is null, undefined, empty, or invalid.
 */
export const safeFormat = (dateVal: any, formatStr: string, fallback: string = 'TBD'): string => {
  if (!dateVal) return fallback;
  const date = new Date(dateVal);
  if (isNaN(date.getTime())) return fallback;
  try {
    return format(date, formatStr);
  } catch (error) {
    console.error('Error formatting date:', dateVal, error);
    return fallback;
  }
};
