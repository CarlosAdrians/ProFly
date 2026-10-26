import { formatPhone, isValidPhone, phoneDigits } from './phone';

describe('telefone', () => {
  it('formata celular e fixo enquanto digita', () => {
    expect(formatPhone('8')).toBe('(8');
    expect(formatPhone('839')).toBe('(83) 9');
    expect(formatPhone('83986693221')).toBe('(83) 98669-3221');
    expect(formatPhone('8333334444')).toBe('(83) 3333-4444');
    expect(formatPhone('(83) 98669-32219999')).toBe('(83) 98669-3221');
  });

  it('valida DDD + número', () => {
    expect(isValidPhone('(83) 98669-3221')).toBe(true);
    expect(isValidPhone('8333334444')).toBe(true);
    expect(isValidPhone('83 8669-322')).toBe(false);
    expect(isValidPhone('83812345678')).toBe(false);
    expect(isValidPhone('00999999999')).toBe(false);
    expect(isValidPhone('23999999999')).toBe(false);
    expect(isValidPhone('8311112222')).toBe(false);
    expect(isValidPhone('abc83999999999')).toBe(false);
    expect(isValidPhone('+55 (83) 99999-9999')).toBe(false);
    expect(phoneDigits('(83) 9 8669-3221')).toBe('83986693221');
  });
});
