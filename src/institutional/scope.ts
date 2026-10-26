import { createContext, useContext } from 'react';
import type { CatalogItem } from './types';
import { useApiSession } from './hooks';
export const Scope = createContext<{
  courseId: string;
  courses: CatalogItem[];
  asTeacher: boolean;
}>({
  courseId: '',
  courses: [],
  asTeacher: false,
});
export const useScope = () => useContext(Scope);
export function useAcademicReviewer() {
  const { courseId, courses } = useScope();
  const { user } = useApiSession();
  return Boolean(
    user?.roles.includes('coordinator') &&
    courses.some((course) => course.id === courseId && course.roles?.includes('coordinator')),
  );
}
