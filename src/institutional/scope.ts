import { createContext, useContext } from 'react';
import type { CatalogItem } from './types';
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
