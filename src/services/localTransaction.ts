/** Best-effort rollback for the browser demo. MongoDB transactions belong to the API. */
export function commitLocalChanges(changes: Record<string, string>) {
  const before = Object.fromEntries(
    Object.keys(changes).map((key) => [key, localStorage.getItem(key)]),
  );
  try {
    for (const [key, value] of Object.entries(changes)) localStorage.setItem(key, value);
  } catch {
    for (const [key, value] of Object.entries(before)) {
      try {
        if (value === null) localStorage.removeItem(key);
        else localStorage.setItem(key, value);
      } catch {
        /* The original failure is still reported, never a successful save. */
      }
    }
    throw new Error(
      'Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e tente novamente.',
    );
  }
}
