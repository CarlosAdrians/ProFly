export const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Fortaleza' }).format(new Date());
export const timeLabel = (instant: string) =>
  new Intl.DateTimeFormat('pt-BR', {
    timeZone: 'America/Fortaleza',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(instant));
export const dayLabel = (date: string) => new Date(`${date}T12:00:00Z`).toLocaleDateString('pt-BR');
