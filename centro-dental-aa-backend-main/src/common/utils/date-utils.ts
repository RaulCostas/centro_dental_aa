/**
 * Utility functions for local date and time formatting without UTC shifts.
 */

/**
 * Returns a date string in 'YYYY-MM-DD' format using the local timezone.
 * @param d Optional Date object (defaults to current time)
 */
export function getLocalDateString(d: Date = new Date()): string {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

/**
 * Returns a time string in 'HH:MM:SS' or 'HH:MM' format using the local timezone.
 * @param d Optional Date object (defaults to current time)
 */
export function getLocalTimeString(d: Date = new Date()): string {
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
}
