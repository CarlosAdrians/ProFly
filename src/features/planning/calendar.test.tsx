import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, vi } from 'vitest';
import { monthDays, shiftMonth } from './calendarDates';
import { loadHolidays, parseHolidays, paraibaHoliday } from './holidays';
import { MonthCalendar } from './MonthCalendar';
const apiRows = [
  { date: '2026-10-12', name: 'Nossa Senhora Aparecida', type: 'national' },
  { date: '2026-02-17', name: 'Carnaval', type: 'national' },
];
afterEach(() => vi.restoreAllMocks());
it('navega entre meses sem pular fevereiro e inclui todos os dias da grade', () => {
  expect(shiftMonth('2026-01-31', 1)).toBe('2026-02-01');
  expect(shiftMonth('2026-12-31', 1)).toBe('2027-01-01');
  expect(shiftMonth('2026-01-01', -1)).toBe('2025-12-01');
  expect(monthDays('2028-02-20')).toContain('2028-02-29');
  expect(monthDays('2026-08-01')).toHaveLength(42);
});
it('classifica pontos facultativos sem considera-los automaticamente feriado nacional', () => {
  expect(parseHolidays(apiRows, 2026).map((item) => item.scope)).toEqual([
    'Nacional',
    'Confirmar localmente',
  ]);
  expect(paraibaHoliday(2026)).toMatchObject({ date: '2026-08-05', scope: 'Paraíba' });
  expect(() => parseHolidays([{ date: '2026-02-30', name: 'Inválido' }], 2026)).toThrow();
  expect(() => parseHolidays([{ date: '2025-10-12', name: 'Outro ano' }], 2026)).toThrow();
});
it('consulta somente o ano sem credenciais e reutiliza cache validado', async () => {
  const fetcher = vi.fn().mockResolvedValue({ ok: true, json: async () => apiRows });
  vi.stubGlobal('fetch', fetcher);
  const first = await loadHolidays(2026);
  expect(first.items).toHaveLength(3);
  expect(fetcher).toHaveBeenCalledWith(
    'https://brasilapi.com.br/api/feriados/v1/2026',
    expect.objectContaining({ credentials: 'omit', referrerPolicy: 'no-referrer' }),
  );
  expect((await loadHolidays(2026)).status).toMatch(/salva/);
  expect(fetcher).toHaveBeenCalledTimes(1);
});
it('sinaliza falha, conserva cache antigo e nao confunde indisponibilidade com ausencia de feriados', async () => {
  expect((await loadHolidays(2026)).status).toMatch(/nacionais ainda não carregados/);
  localStorage.setItem(
    'profly:holidays:v1:2026',
    JSON.stringify({ at: Date.now() - 90000000, items: apiRows }),
  );
  const result = await loadHolidays(2026);
  expect(result.status).toMatch(/desatualizados/);
  expect(result.items.map((item) => item.date)).toContain('2026-10-12');
});
it('exibe feriado com fonte e abre o dia pelo teclado', async () => {
  const user = userEvent.setup();
  const onDay = vi.fn();
  render(
    <MonthCalendar
      date="2026-08-01"
      plans={[]}
      holidays={[paraibaHoliday(2026)]}
      onDay={onDay}
      onPlan={vi.fn()}
    />,
  );
  const table = screen.getByRole('table', { name: 'Calendário mensal' });
  expect(within(table).getAllByRole('columnheader')).toHaveLength(7);
  expect(screen.getByRole('link', { name: /Data Magna da Paraíba/ })).toHaveAttribute(
    'href',
    paraibaHoliday(2026).source,
  );
  const day = screen.getByRole('button', { name: 'Ver dia 5 de agosto de 2026' });
  day.focus();
  await user.keyboard('{Enter}');
  expect(onDay).toHaveBeenCalledWith('2026-08-05');
});
