import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { demoCoordinator } from '../../../mocks/coordinator';
import { AuthProvider } from './AuthProvider';
import { SESSION_KEY } from './authContext';
import { useAuth } from './useAuth';

const wrapper = ({ children }: { children: ReactNode }) => <AuthProvider>{children}</AuthProvider>;

describe('sessão simulada', () => {
  it('começa sem sessão', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
  });

  it('cria, restaura e encerra a sessão', async () => {
    const { result, unmount } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login(demoCoordinator.email, demoCoordinator.password));
    expect(result.current.session?.email).toBe(demoCoordinator.email);
    unmount();

    const restored = renderHook(() => useAuth(), { wrapper });
    expect(restored.result.current.session?.name).toBe(demoCoordinator.name);

    act(() => restored.result.current.logout());
    expect(restored.result.current.session).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('aceita e-mail com maiúsculas e espaços', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() =>
      result.current.login(`  ${demoCoordinator.email.toUpperCase()} `, demoCoordinator.password),
    );
    expect(result.current.session).not.toBeNull();
  });

  it('rejeita senha incorreta', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await expect(result.current.login(demoCoordinator.email, 'x')).rejects.toThrow(
      'E-mail ou senha inválidos.',
    );
    expect(result.current.session).toBeNull();
  });

  it('ignora sessão corrompida no armazenamento', () => {
    sessionStorage.setItem(SESSION_KEY, '{inválido');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
  });
});
