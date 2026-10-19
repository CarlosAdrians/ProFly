import { normalizeCode, normalizeSubjectName, validateSubject } from './validation';

const existing = [
  { name: 'Direito Civil I', code: 'DIR201' },
  { name: 'Ética Profissional', code: 'DIR501' },
];

describe('validateSubject', () => {
  it('aceita nome e código válidos', () => {
    expect(validateSubject({ name: 'Direito Digital', code: 'dir601' }, existing)).toEqual({});
  });

  it('exige nome e código', () => {
    expect(validateSubject({ name: '  ', code: '' }, existing)).toEqual({
      name: 'Informe o nome da disciplina.',
      code: 'Informe o código.',
    });
  });

  it('valida tamanho do nome e formato do código', () => {
    const errors = validateSubject({ name: 'Ab', code: 'DIR 1' }, existing);
    expect(errors.name).toMatch(/pelo menos 3/);
    expect(errors.code).toMatch(/2 a 20 caracteres/);
    expect(validateSubject({ name: 'x'.repeat(101), code: 'A' }, []).name).toMatch(/no máximo 100/);
    expect(validateSubject({ name: 'Válida', code: 'A' }, []).code).toBeDefined();
    expect(validateSubject({ name: 'Válida', code: '+8849887787' }, []).code).toBeDefined();
    expect(validateSubject({ name: 'Válida', code: 'DIR-1.A' }, [])).toEqual({});
  });

  it('impede código duplicado sem diferenciar maiúsculas e espaços', () => {
    expect(validateSubject({ name: 'Nova', code: ' dir201 ' }, existing).code).toBe(
      'O código DIR201 já pertence a “Direito Civil I”.',
    );
  });

  it('impede nome duplicado sem diferenciar acentos, maiúsculas e espaços', () => {
    expect(
      validateSubject({ name: '  etica   PROFISSIONAL ', code: 'DIR999' }, existing).name,
    ).toBe('Já existe a disciplina “Ética Profissional” (código DIR501).');
  });

  it('normaliza código e nome', () => {
    expect(normalizeCode(' dir101 ')).toBe('DIR101');
    expect(normalizeSubjectName(' Direito  CIVIL  I ')).toBe('direito civil i');
  });
});
