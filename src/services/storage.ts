/**
 * Acesso seguro ao armazenamento do navegador (JSON).
 * Falhas (modo privado, cota, dados corrompidos) não interrompem a interface.
 */
export function readJson<T>(storage: Storage, key: string): T | null {
  try {
    const raw = storage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

export function writeJson(storage: Storage, key: string, value: unknown): void {
  try {
    storage.setItem(key, JSON.stringify(value));
  } catch {
    // Persistência é apenas uma conveniência na demonstração.
  }
}

export function removeItem(storage: Storage, key: string): void {
  try {
    storage.removeItem(key);
  } catch {
    // Ignorado pelo mesmo motivo de writeJson.
  }
}

/** Simula a latência de uma chamada de rede. */
export function simulateLatency(ms = 400): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
