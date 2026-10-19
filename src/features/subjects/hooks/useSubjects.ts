import { useEntityCollection } from '../../../hooks/useEntityCollection';
import { subjectService } from '../services/subjectService';

export function useSubjects() {
  const { items, ...actions } = useEntityCollection(
    subjectService,
    subjectService.createWithGeneratedCode,
  );
  return { subjects: items, ...actions };
}
