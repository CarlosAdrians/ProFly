import { useCallback, useEffect, useState } from 'react';
import { getAccount, updateAccount } from '../services/accountService';
import type { Account, AccountInput } from '../types';

/** Carrega e salva os dados cadastrais do usuário da sessão. */
export function useAccount(session: { name: string; email: string } | null) {
  const [account, setAccount] = useState<Account | null>(null);
  const [error, setError] = useState('');
  const email = session?.email;
  const sessionName = session?.name;

  useEffect(() => {
    if (!email || !sessionName) return;
    let active = true;
    getAccount({ email, name: sessionName })
      .then((loaded) => {
        if (active) {
          setAccount(loaded);
          setError('');
        }
      })
      .catch(() => {
        if (active)
          setError(
            'Não foi possível carregar os dados da conta. Os dados locais foram preservados.',
          );
      });
    return () => {
      active = false;
    };
  }, [email, sessionName]);

  const save = useCallback(
    async (input: AccountInput) => {
      if (!email) throw new Error('Sessão encerrada.');
      const updated = await updateAccount(email, input);
      setAccount(updated);
      return updated;
    },
    [email],
  );

  return { account, save, error };
}
