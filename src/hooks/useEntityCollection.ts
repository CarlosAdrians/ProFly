import { useCallback, useEffect, useState } from 'react';
import type { EntityStatus } from '../components/ui/StatusBadge/status';
import type { createLocalCollection, Entity } from '../services/localCollection';

type StatusEntity = Entity & { status: EntityStatus };
type Service<T extends StatusEntity> = ReturnType<typeof createLocalCollection<T>>;

/**
 * Estado de uma coleção com status (professores, disciplinas):
 * carrega, cadastra (sempre ativo), edita e ativa/inativa.
 */
export function useEntityCollection<T extends StatusEntity>(service: Service<T>) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    service.list().then((loaded) => {
      if (!active) return;
      setItems(loaded);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [service]);

  const replace = useCallback(
    (updated: T) =>
      setItems((current) => current.map((item) => (item.id === updated.id ? updated : item))),
    [],
  );

  const create = useCallback(
    async (input: Omit<T, 'id' | 'status'>) => {
      const created = await service.create({ ...input, status: 'active' } as Omit<T, 'id'>);
      setItems((current) => [...current, created]);
      return created;
    },
    [service],
  );

  const update = useCallback(
    async (id: string, changes: Partial<Omit<T, 'id' | 'status'>>) => {
      const updated = await service.update(id, changes as Partial<Omit<T, 'id'>>);
      replace(updated);
      return updated;
    },
    [service, replace],
  );

  const setStatus = useCallback(
    async (id: string, status: EntityStatus) => {
      const updated = await service.update(id, { status } as Partial<Omit<T, 'id'>>);
      replace(updated);
      return updated;
    },
    [service, replace],
  );

  return { items, loading, create, update, setStatus };
}
