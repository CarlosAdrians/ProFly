import { useCallback, useEffect, useState } from 'react';
import type { EntityStatus } from '../../../components/ui/StatusBadge/status';
import { teacherService } from '../services/teacherService';
import type { Teacher, TeacherInput } from '../types';

export function useTeachers() {
  const [teachers, setTeachers] = useState<Teacher[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    teacherService.list().then((items) => {
      if (!active) return;
      setTeachers(items);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const create = useCallback(async (input: TeacherInput) => {
    const created = await teacherService.create({ ...input, status: 'active' });
    setTeachers((items) => [...items, created]);
    return created;
  }, []);

  const update = useCallback(async (id: string, changes: Partial<TeacherInput>) => {
    const updated = await teacherService.update(id, changes);
    setTeachers((items) => items.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  const setStatus = useCallback(async (id: string, status: EntityStatus) => {
    const updated = await teacherService.update(id, { status });
    setTeachers((items) => items.map((item) => (item.id === id ? updated : item)));
    return updated;
  }, []);

  return { teachers, loading, create, update, setStatus };
}
