import { z } from 'zod';

export const date = z.iso.date();
export const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/);
