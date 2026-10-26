import { intendedWindows } from './availabilityCalendar';
it('recorta preferencias por dia e turno sem converter preferencia em aula', () => {
  const windows = [
    { id: 'one', weekday: 0, start: '11:00', end: '19:00' },
    { id: 'two', weekday: 1, start: '19:00', end: '22:00' },
  ];
  expect(intendedWindows(windows, '2026-10-26', 'morning')).toEqual([
    { ...windows[0], end: '12:00' },
  ]);
  expect(intendedWindows(windows, '2026-10-26', 'afternoon')).toEqual([
    { ...windows[0], start: '12:00', end: '18:00' },
  ]);
  expect(intendedWindows(windows, '2026-10-26', 'night')).toEqual([
    { ...windows[0], start: '18:00' },
  ]);
  expect(intendedWindows(windows, '2026-10-27', 'morning')).toEqual([]);
  expect(windows[0].start).toBe('11:00');
});
