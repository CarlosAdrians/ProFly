import { readJson, writeJson } from './storage';

export interface Entity {
  id: string;
}

function createId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

/**
 * Coleção persistida no localStorage, iniciada com dados fictícios.
 * Expõe uma API assíncrona para facilitar a troca futura por chamadas à API.
 */
export function createLocalCollection<T extends Entity>(key: string, seed: () => T[]) {
  function load(): T[] {
    const stored = readJson<T[]>(localStorage, key);
    if (Array.isArray(stored)) return stored;
    const initial = seed();
    writeJson(localStorage, key, initial);
    return initial;
  }

  function save(items: T[]): void {
    writeJson(localStorage, key, items);
  }

  return {
    async list(): Promise<T[]> {
      return load();
    },

    async create(data: Omit<T, 'id'>): Promise<T> {
      const item = { ...data, id: createId() } as T;
      save([...load(), item]);
      return item;
    },

    async update(id: string, changes: Partial<Omit<T, 'id'>>): Promise<T> {
      const items = load();
      const index = items.findIndex((item) => item.id === id);
      if (index === -1) throw new Error('Registro não encontrado.');
      const updated = { ...items[index], ...changes };
      items[index] = updated;
      save(items);
      return updated;
    },
  };
}
