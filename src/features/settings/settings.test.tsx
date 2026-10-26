import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { renderApp } from '../../test/renderApp';
import { demoCoordinator } from '../../mocks/coordinator';
import { readPreferences, savePreferences } from './preferences';
it('salva preferencias e aplica turno, visualizacao e feriados ao abrir o calendario', async () => {
  const user = userEvent.setup();
  renderApp('/configuracoes', { authenticated: true });
  expect(screen.getByRole('heading', { name: 'Configurações', level: 1 })).toBeInTheDocument();
  await user.selectOptions(screen.getByRole('combobox', { name: /Visualização inicial/ }), 'month');
  await user.selectOptions(screen.getByRole('combobox', { name: /Turno inicial/ }), 'morning');
  await user.click(screen.getByRole('switch', { name: 'Mostrar feriados' }));
  await user.click(screen.getByRole('button', { name: 'Escuro' }));
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(readPreferences(demoCoordinator.email)).toEqual({
    view: 'month',
    shift: 'morning',
    showHolidays: false,
  });
  await user.click(screen.getByRole('link', { name: 'Calendário' }));
  expect(await screen.findByRole('table', { name: 'Calendário mensal' })).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Manhã' })).toHaveAttribute('aria-pressed', 'true');
  expect(
    screen.queryByRole('region', { name: 'Feriados e datas do período' }),
  ).not.toBeInTheDocument();
  expect(fetch).not.toHaveBeenCalled();
});
it('isola preferencias por conta e nao anuncia salvamento quando o armazenamento falha', async () => {
  savePreferences('outra@profly.test', { view: 'day', shift: 'afternoon', showHolidays: false });
  expect(readPreferences(demoCoordinator.email).view).toBe('week');
  const user = userEvent.setup();
  renderApp('/configuracoes', { authenticated: true });
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  await user.selectOptions(screen.getByRole('combobox', { name: /Turno inicial/ }), 'afternoon');
  expect(screen.getByRole('alert')).toHaveTextContent('Não foi possível salvar as preferências');
  expect(readPreferences(demoCoordinator.email).shift).toBe('night');
  fail.mockRestore();
});
it('exige sessao para abrir configuracoes', () => {
  expect(renderApp('/configuracoes').router.state.location.pathname).toBe('/login');
});
