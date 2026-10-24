import { useEffect, useState } from 'react';
import type { Shift } from '../planning/service';
export interface CalendarPreferences {
  view: 'month' | 'week' | 'day';
  shift: Shift;
  showHolidays: boolean;
}
const event = 'profly:preferences-changed';
const keyFor = (email: string) => `profly:preferences:v1:${email}`;
export function readPreferences(email: string, teacher = false): CalendarPreferences {
  const fallback: CalendarPreferences = {
    view: teacher ? 'month' : 'week',
    shift: 'night',
    showHolidays: true,
  };
  try {
    const value = JSON.parse(localStorage.getItem(keyFor(email)) ?? 'null');
    if (
      value &&
      ['month', 'week', 'day'].includes(value.view) &&
      ['morning', 'afternoon', 'night'].includes(value.shift) &&
      typeof value.showHolidays === 'boolean'
    )
      return value;
  } catch {
    /* Invalid preferences do not prevent access to academic data. */
  }
  return fallback;
}
export function savePreferences(email: string, value: CalendarPreferences) {
  if (
    !email ||
    !['month', 'week', 'day'].includes(value.view) ||
    !['morning', 'afternoon', 'night'].includes(value.shift) ||
    typeof value.showHolidays !== 'boolean'
  )
    throw new Error('Confira as preferências do calendário.');
  try {
    localStorage.setItem(keyFor(email), JSON.stringify(value));
  } catch {
    throw new Error('Não foi possível salvar as preferências neste navegador.');
  }
  window.dispatchEvent(new Event(event));
}
export function usePreferences(email: string, teacher = false) {
  const [value, setValue] = useState(() => readPreferences(email, teacher));
  useEffect(() => {
    const refresh = () => setValue(readPreferences(email, teacher));
    window.addEventListener(event, refresh);
    window.addEventListener('storage', refresh);
    return () => {
      window.removeEventListener(event, refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [email, teacher]);
  return value;
}
