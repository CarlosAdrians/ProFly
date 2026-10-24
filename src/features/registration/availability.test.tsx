/// <reference types="node" />
import { webcrypto } from 'node:crypto';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import { registrationFixture, TEST_PASSWORD } from '../../test/registrationFixture';
import { renderApp } from '../../test/renderApp';
import { SESSION_KEY } from '../auth/session/authContext';
import {
  listDemoProfiles,
  registerDemo,
  saveDemoAvailability,
  reviewDemoRequest,
} from './demoService';
async function teacher() {
  vi.stubGlobal('crypto', webcrypto);
  const data = registrationFixture();
  const profile = await registerDemo(data, TEST_PASSWORD, TEST_PASSWORD, true, true);
  sessionStorage.setItem(
    SESSION_KEY,
    JSON.stringify({
      name: profile.name,
      email: profile.email,
      role: 'teacher',
      startedAt: new Date().toISOString(),
    }),
  );
  return profile;
}
it('edita e persiste disponibilidade pela pagina, preservando os cursos', async () => {
  const profile = await teacher();
  const user = userEvent.setup();
  renderApp('/disponibilidade');
  await user.selectOptions(screen.getByRole('combobox', { name: 'Dia da semana' }), '1');
  await user.click(screen.getByRole('button', { name: 'Adicionar à semana' }));
  expect(listDemoProfiles()[0].availability).toHaveLength(1);
  await user.click(screen.getByRole('button', { name: 'Salvar disponibilidade' }));
  expect(screen.getByText(/Disponibilidade salva/)).toBeInTheDocument();
  expect(listDemoProfiles()[0].availability).toHaveLength(2);
  expect(listDemoProfiles()[0].requests).toEqual(profile.requests);
});
it('recusa sobreposicao, perfil obsoleto e falha de gravacao sem mudar o perfil', async () => {
  const profile = await teacher();
  reviewDemoRequest(profile.email, 'direito', 'APPROVED', 'Formação conferida', profile.version);
  const current = listDemoProfiles()[0];
  const before = JSON.stringify(current);
  expect(() =>
    saveDemoAvailability(
      current.email,
      [...current.availability, { id: 'overlap', weekday: 0, start: '19:00', end: '22:00' }],
      current.weeklyHours,
      current.version,
    ),
  ).toThrow(/sobrepostos/);
  expect(() =>
    saveDemoAvailability(current.email, current.availability, '30', profile.version),
  ).toThrow(/mudou/);
  const fail = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
    throw new Error('quota');
  });
  expect(() =>
    saveDemoAvailability(current.email, current.availability, '30', current.version),
  ).toThrow(/salvar/);
  fail.mockRestore();
  expect(JSON.stringify(listDemoProfiles()[0])).toBe(before);
});
it('coordenador nao abre a edicao de disponibilidade docente', () => {
  expect(
    renderApp('/disponibilidade', { authenticated: true }).router.state.location.pathname,
  ).toBe('/professores');
});
