import { useEntityCollection } from '../../../hooks/useEntityCollection';
import { subjectService } from '../services/subjectService';

export function useSubjects() {
  const { items, ...actions } = useEntityCollection(subjectService);
  return { subjects: items, ...actions };
}
