import { validateAccount } from './validation';

describe('validateAccount', () => {
  it('aceita um nome válido', () => {
    expect(validateAccount({ name: 'Felipe Araujo' })).toEqual({});
  });

  it('exige o nome', () => {
    expect(validateAccount({ name: '   ' })).toEqual({ name: 'Informe o nome completo.' });
  });

  it('valida o tamanho do nome', () => {
    expect(validateAccount({ name: 'Fe' }).name).toMatch(/pelo menos 3/);
    expect(validateAccount({ name: 'x'.repeat(101) }).name).toMatch(/no máximo 100/);
  });
});
