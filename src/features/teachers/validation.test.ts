import { validateTeacher, type TeacherFormValues } from './validation';

const valid: TeacherFormValues = {
  name: 'Maria Clara',
  email: 'maria@profly.test',
  phone: '(83) 90000-0099',
  area: 'Direito Civil',
  weeklyHours: '20',
};

describe('validateTeacher', () => {
  it('aceita dados válidos', () => {
    expect(validateTeacher(valid, [])).toEqual({});
  });

  it('exige todos os campos', () => {
    const errors = validateTeacher(
      { name: '', email: '', phone: '', area: ' ', weeklyHours: '' },
      [],
    );
    expect(errors).toEqual({
      name: 'Informe o nome completo.',
      email: 'Informe o e-mail.',
      phone: 'Informe o contato.',
      area: 'Informe a área de atuação.',
      weeklyHours: 'Informe a carga horária.',
    });
  });

  it('valida formatos', () => {
    const errors = validateTeacher(
      { ...valid, name: 'Al', email: 'maria@', phone: '839999', weeklyHours: '0' },
      [],
    );
    expect(errors.name).toMatch(/pelo menos 3/);
    expect(errors.email).toBe('Informe um e-mail válido.');
    expect(errors.phone).toBe('Informe um telefone válido com DDD.');
    expect(errors.weeklyHours).toMatch(/entre 1 e 168/);
    expect(validateTeacher({ ...valid, weeklyHours: '169' }, []).weeklyHours).toBeDefined();
  });

  it('impede e-mail duplicado (sem diferenciar maiúsculas)', () => {
    const errors = validateTeacher({ ...valid, email: 'ANA.LIMA@profly.test' }, [
      { email: 'ana.lima@profly.test' },
    ]);
    expect(errors.email).toBe('Já existe um professor com este e-mail.');
  });
});
