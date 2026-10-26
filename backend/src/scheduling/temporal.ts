import { AppError } from '../shared/errors.js';
import type { Meeting, Slot } from './models.js';

export const minutes = (time: string) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3));
export const overlaps = (
  a: Pick<Slot, 'startsAt' | 'endsAt'>,
  b: Pick<Slot, 'startsAt' | 'endsAt'>,
) => a.startsAt < b.endsAt && b.startsAt < a.endsAt;
export function localParts(instant: Date, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(instant);
  const p = Object.fromEntries(parts.map((v) => [v.type, v.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, time: `${p.hour}:${p.minute}` };
}
export function instant(date: string, time: string, timeZone: string) {
  const wall = Date.parse(`${date}T${time}:00Z`);
  let value = wall;
  for (let i = 0; i < 4; i++) {
    const p = localParts(new Date(value), timeZone);
    value += wall - Date.parse(`${p.date}T${p.time}:00Z`);
  }
  const p = localParts(new Date(value), timeZone);
  if (p.date !== date || p.time !== time)
    throw new AppError(422, 'INVALID_LOCAL_TIME', 'Horario inexistente no fuso selecionado.');
  // Ambiguous clock changes require explicit institutional handling, rather than choosing silently.
  if (
    [-3600000, 3600000].some((delta) => {
      const x = localParts(new Date(value + delta), timeZone);
      return x.date === date && x.time === time;
    })
  )
    throw new AppError(422, 'AMBIGUOUS_LOCAL_TIME', 'Horario ambiguo no fuso selecionado.');
  return new Date(value).toISOString();
}
export function expand(meetings: Meeting[], timeZone: string): Slot[] {
  const slots: Slot[] = [];
  for (const meeting of meetings) {
    const day = new Date(`${meeting.validFrom}T12:00:00Z`);
    day.setUTCDate(day.getUTCDate() + ((meeting.weekday - (day.getUTCDay() || 7) + 7) % 7));
    for (
      ;
      day.toISOString().slice(0, 10) <= meeting.validUntil;
      day.setUTCDate(day.getUTCDate() + 7)
    ) {
      if (slots.length >= 4096)
        throw new AppError(422, 'SCHEDULE_TOO_LARGE', 'Reduza o intervalo da oferta.');
      const date = day.toISOString().slice(0, 10);
      slots.push({
        date,
        startsAt: instant(date, meeting.startsAt, timeZone),
        endsAt: instant(date, meeting.endsAt, timeZone),
        minutes: minutes(meeting.endsAt) - minutes(meeting.startsAt),
      });
    }
  }
  slots.sort((a, b) => a.startsAt.localeCompare(b.startsAt));
  if (slots.some((a, i) => slots.slice(i + 1).some((b) => overlaps(a, b))))
    throw new AppError(422, 'OVERLAPPING_MEETINGS', 'Encontros sobrepostos.');
  return slots;
}
export function weekKey(startsAt: string, timeZone: string) {
  const date = localParts(new Date(startsAt), timeZone).date;
  const day = new Date(`${date}T12:00:00Z`);
  day.setUTCDate(day.getUTCDate() - ((day.getUTCDay() + 6) % 7));
  return day.toISOString().slice(0, 10);
}
export function unionMinutes(slots: Slot[], timeZone: string) {
  const weeks = new Map<string, { start: number; end: number }[]>();
  for (const slot of slots) {
    const key = weekKey(slot.startsAt, timeZone);
    const entries = weeks.get(key) ?? [];
    entries.push({ start: Date.parse(slot.startsAt), end: Date.parse(slot.endsAt) });
    weeks.set(key, entries);
  }
  return [...weeks].map(([week, values]) => {
    values.sort((a, b) => a.start - b.start);
    let sum = 0;
    let end = 0;
    for (const value of values) {
      sum += Math.max(0, value.end - Math.max(end, value.start));
      end = Math.max(end, value.end);
    }
    return { week, minutes: sum / 60000 };
  });
}
