import type { Allocation, Meeting } from './types';
export function addDate(date: string, days: number) {
  const value = new Date(`${date}T12:00:00Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}
export function weekday(date: string) {
  return new Date(`${date}T12:00:00Z`).getUTCDay() || 7;
}
export function monday(date: string) {
  return addDate(date, -(weekday(date) - 1));
}
export function monthDates(date: string) {
  const first = `${date.slice(0, 7)}-01`,
    last = new Date(`${first}T12:00:00Z`);
  last.setUTCMonth(last.getUTCMonth() + 1, 0);
  const count = Math.ceil((last.getUTCDate() + weekday(first) - 1) / 7) * 7;
  return Array.from({ length: count }, (_, i) => addDate(monday(first), i));
}
function containsMeeting(m: Meeting) {
  const first = addDate(m.validFrom, (m.weekday - weekday(m.validFrom) + 7) % 7);
  return first <= m.validUntil;
}
/** Move one occurrence; all other dates and recurring meetings remain unchanged. */
export function moveMeeting(record: Allocation, from: string, to: string): Meeting[] {
  if (from === to) return record.meetings;
  const source = record.meetings.find(
    (m) => m.weekday === weekday(from) && m.validFrom <= from && m.validUntil >= from,
  );
  if (!source) throw new Error('O encontro mudou. Atualize o calendário antes de mover.');
  const before = { ...source, id: crypto.randomUUID(), validUntil: addDate(from, -1) };
  const after = { ...source, id: crypto.randomUUID(), validFrom: addDate(from, 1) };
  return [
    ...record.meetings.filter((m) => m.id !== source.id),
    ...[before, after].filter((m) => m.validFrom <= m.validUntil && containsMeeting(m)),
    { ...source, id: crypto.randomUUID(), weekday: weekday(to), validFrom: to, validUntil: to },
  ];
}
