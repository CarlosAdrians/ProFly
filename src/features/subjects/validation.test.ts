import { normalizeSubjectName, validateSubject } from './validation';

const existing = [
  { name: 'Direito Civil I', code: 'DIR201' },
  { name: 'Ética Profissional', code: 'DIR501' },
];

describe('validateSubject', () => {
  it('aceita um nome válido (o código não é informado pelo usuário)', () => {
    expect(validateSubject({ name: 'Direito Digital' }, existing)).toEqual({});
  });

  it('exige o nome', () => {
    expect(validateSubject({ name: '  ' }, existing)).toEqual({
      name: 'Informe o nome da disciplina.',
    });
  });

  it('valida o tamanho do nome', () => {
    expect(validateSubject({ name: 'Ab' }, existing).name).toMatch(/pelo menos 3/);
    expect(validateSubject({ name: 'x'.repeat(101) }, []).name).toMatch(/no máximo 100/);
  });

  it('impede nome duplicado sem diferenciar acentos, maiúsculas e espaços', () => {
    expect(validateSubject({ name: '  etica   PROFISSIONAL ' }, existing).name).toBe(
      'Já existe a disciplina “Ética Profissional” (código DIR501).',
    );
  });

  it('normaliza o nome para comparação', () => {
    expect(normalizeSubjectName(' Direito  CIVIL  I ')).toBe('direito civil i');
  });
});
