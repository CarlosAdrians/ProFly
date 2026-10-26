export const calendarShiftOptions = [
  { id: 'ALL', label: 'Todos', icon: 'calendar' },
  { id: 'MORNING', label: 'Manhã', icon: 'sunrise' },
  { id: 'AFTERNOON', label: 'Tarde', icon: 'sun' },
  { id: 'NIGHT', label: 'Noite', icon: 'moon' },
] as const;
export type CalendarShift = (typeof calendarShiftOptions)[number]['id'];
const localHour = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'America/Fortaleza',
  hour: '2-digit',
  hourCycle: 'h23',
});
export function lessonDayPart(instant: string) {
  const hour = Number(localHour.format(new Date(instant)));
  return hour < 12
    ? calendarShiftOptions[1]
    : hour < 18
      ? calendarShiftOptions[2]
      : calendarShiftOptions[3];
}
