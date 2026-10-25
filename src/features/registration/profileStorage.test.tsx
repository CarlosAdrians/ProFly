import { act, renderHook, screen } from '@testing-library/react';
import { registrationFixture } from '../../test/registrationFixture';
import { renderApp } from '../../test/renderApp';
import { changedEvent, REGISTRATION_KEY, useDemoProfiles } from './demoService';
import { parseStoredAccounts } from './profileStorage';

function account() {
  return {
    profile: {
      ...registrationFixture(),
      id: 'test-profile',
      version: 1,
      createdAt: '2026-01-01',
      acceptedAt: '2026-01-01',
      legalVersion: 'test',
    },
    salt: Array(16).fill(0),
    proof: Array(32).fill(0),
  };
}
it.each([
  '{',
  '{}',
  '[null]',
  JSON.stringify([{ ...account(), profile: { ...account().profile, requests: {} } }]),
  JSON.stringify([{ ...account(), profile: { ...account().profile, knowledge: [null] } }]),
])('conserva cadastros malformados sem derrubar a listagem: %s', async (raw) => {
  localStorage.setItem(REGISTRATION_KEY, raw);
  renderApp('/professores', { authenticated: true });
  expect(await screen.findByText('Ana Beatriz Lima')).toBeInTheDocument();
  expect(screen.getByRole('alert')).toHaveTextContent(/dados foram preservados/);
  expect(localStorage.getItem(REGISTRATION_KEY)).toBe(raw);
  expect(() => parseStoredAccounts(raw)).toThrow(/preservados/);
});
it('atualiza o snapshot entre abas e recupera a leitura sem sobrescrever registros', () => {
  const { result } = renderHook(useDemoProfiles);
  expect(result.current.profiles).toEqual([]);
  const raw = JSON.stringify([account()]);
  act(() => {
    localStorage.setItem(REGISTRATION_KEY, raw);
    window.dispatchEvent(new Event(changedEvent));
  });
  expect(result.current.profiles[0].id).toBe('test-profile');
  act(() => {
    localStorage.setItem(REGISTRATION_KEY, '{}');
    window.dispatchEvent(new Event('storage'));
  });
  expect(result.current.profiles).toEqual([]);
  expect(result.current.error).toMatch(/preservados/);
  act(() => {
    localStorage.setItem(REGISTRATION_KEY, raw);
    window.dispatchEvent(new Event('storage'));
  });
  expect(result.current.profiles).toHaveLength(1);
  expect(result.current.error).toBe('');
});
