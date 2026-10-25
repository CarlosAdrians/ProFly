import { z } from 'zod';
const codes = new Set(
  '11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(
    ' ',
  ),
);
export const phone = z
  .string()
  .trim()
  .max(25)
  .refine((value) => {
    if (!/^\+?[\d\s().-]+$/.test(value)) return false;
    let digits = value.replace(/\D/g, '');
    if (value.startsWith('+55')) digits = digits.slice(2);
    return (
      codes.has(digits.slice(0, 2)) &&
      ((digits.length === 10 && /^[2-5]/.test(digits.slice(2))) ||
        (digits.length === 11 && digits[2] === '9'))
    );
  }, 'Informe telefone nacional com DDD valido.');
