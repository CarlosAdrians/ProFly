import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { demoCoordinator } from '../../../mocks/coordinator';
import { ACCOUNT_STORAGE_KEY } from '../../account/services/accountService';
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

  it('atualiza o nome da sessão atual e o persiste no sessionStorage', async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login(demoCoordinator.email, demoCoordinator.password));
    act(() => result.current.updateSession({ name: 'Felipe Araujo Lima' }));
    expect(result.current.session?.name).toBe('Felipe Araujo Lima');
    expect(JSON.parse(sessionStorage.getItem(SESSION_KEY)!).name).toBe('Felipe Araujo Lima');
  });

  it('não cria sessão ao atualizar sem estar autenticado', () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    act(() => result.current.updateSession({ name: 'Ninguém' }));
    expect(result.current.session).toBeNull();
    expect(sessionStorage.getItem(SESSION_KEY)).toBeNull();
  });

  it('o login traz o nome salvo no perfil da conta', async () => {
    localStorage.setItem(
      ACCOUNT_STORAGE_KEY,
      JSON.stringify({ email: demoCoordinator.email, name: 'Felipe Araujo Lima' }),
    );
    const { result } = renderHook(() => useAuth(), { wrapper });
    await act(() => result.current.login(demoCoordinator.email, demoCoordinator.password));
    expect(result.current.session?.name).toBe('Felipe Araujo Lima');
  });

  it('ignora sessão corrompida no armazenamento', () => {
    sessionStorage.setItem(SESSION_KEY, '{inválido');
    const { result } = renderHook(() => useAuth(), { wrapper });
    expect(result.current.session).toBeNull();
  });
});
