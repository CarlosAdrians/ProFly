import type { Availability } from '../registration/model';
import type { Shift } from './service';

const limits: Record<Shift, [string, string]> = {
  morning: ['00:00', '12:00'],
  afternoon: ['12:00', '18:00'],
  night: ['18:00', '24:00'],
};
/** Repeating declarations, clipped to the selected shift. These are never class occurrences. */
export function intendedWindows(availability: Availability[], date: string, shift: Shift) {
  const weekday = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  const [start, end] = limits[shift];
  return availability
    .filter((item) => item.weekday === weekday && item.start < end && start < item.end)
    .map((item) => ({
      ...item,
      start: item.start > start ? item.start : start,
      end: item.end < end ? item.end : end,
    }))
    .sort((a, b) => a.start.localeCompare(b.start));
}
