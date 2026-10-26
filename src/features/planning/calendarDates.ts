import { addDays, isoDate, monday } from './service';
export function shiftMonth(date: string, delta: number) {
  const current = new Date(`${date}T12:00:00`);
  return isoDate(new Date(current.getFullYear(), current.getMonth() + delta, 1, 12));
}
export function monthDays(date: string) {
  const first = `${date.slice(0, 7)}-01`;
  const start = monday(first);
  const last = new Date(`${first}T12:00:00`);
  last.setMonth(last.getMonth() + 1, 0);
  const count =
    Math.ceil((Number(last.getDate()) + ((new Date(`${first}T12:00:00`).getDay() + 6) % 7)) / 7) *
    7;
  return Array.from({ length: count }, (_, index) => addDays(start, index));
}
