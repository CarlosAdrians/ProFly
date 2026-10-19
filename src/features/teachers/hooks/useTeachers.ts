import { useEntityCollection } from '../../../hooks/useEntityCollection';
import { teacherService } from '../services/teacherService';

export function useTeachers() {
  const { items, ...actions } = useEntityCollection(teacherService);
  return { teachers: items, ...actions };
}
