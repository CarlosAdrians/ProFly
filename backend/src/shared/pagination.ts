import { z } from 'zod';

export const listQuery = z.strictObject({
  limit: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(1).max(200))
    .default(100),
  offset: z
    .string()
    .regex(/^\d+$/)
    .transform(Number)
    .pipe(z.number().int().min(0).max(1000000))
    .default(0),
});

/** Caller fetches limit + 1 after authorization/filtering, with a stable tie-breaking sort. */
export function pageOf<T>(values: T[], page: { limit: number; offset: number }) {
  return {
    items: values.slice(0, page.limit),
    ...page,
    nextOffset: values.length > page.limit ? page.offset + page.limit : null,
  };
}
