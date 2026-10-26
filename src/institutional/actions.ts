import { createContext, useContext, useRef, useState } from 'react';
export const ModalBusy = createContext<((working: boolean) => void) | null>(null);
export function useAction() {
  const modalBusy = useContext(ModalBusy),
    working = useRef(false);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState<Error | null>(null),
    [message, setMessage] = useState('');
  return {
    busy,
    error,
    message,
    setMessage,
    run: async (action: () => Promise<void>, success = '') => {
      if (working.current) return false;
      working.current = true;
      modalBusy?.(true);
      setBusy(true);
      setError(null);
      setMessage('');
      try {
        await action();
        if (success) setMessage(success);
        return true;
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Não foi possível concluir.'));
        return false;
      } finally {
        setBusy(false);
        working.current = false;
        modalBusy?.(false);
      }
    },
  };
}
