import { z } from 'zod';

export const roomInput = z
  .string()
  .trim()
  .min(1)
  .max(80)
  .regex(
    /^[\p{L}\p{N}][\p{L}\p{N} ._()/–-]*$/u,
    'Informe o nome ou numero da sala, sem caracteres especiais.',
  )
  .transform((value) => value.replace(/ +/g, ' '))
  .nullable()
  .optional();

/** Room names are shared across courses, independently of periods and teachers. */
export function roomKey(room: string | null | undefined): string | null {
  if (!room) return null;
  return room
    .normalize('NFKD')
    .replace(/\p{M}/gu, '')
    .toLocaleLowerCase('pt-BR')
    .trim()
    .replace(/\s+/g, ' ')
    .replace(/^sala\s+(?=.)/, '');
}
