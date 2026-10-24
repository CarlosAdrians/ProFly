import { useEffect, useState } from 'react';
export const INSTITUTION_TIME_ZONE = 'America/Fortaleza';
export function institutionToday(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: INSTITUTION_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find((value) => value.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}
export function isPastDate(date: string, today = institutionToday()) {
  return !!date && date < today;
}
export function useInstitutionToday() {
  const [today, setToday] = useState(institutionToday);
  useEffect(() => {
    const refresh = () => setToday(institutionToday());
    const timer = setInterval(refresh, 30000);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, []);
  return today;
}
