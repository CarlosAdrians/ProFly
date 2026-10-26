import { validateNewPassword } from './passwordPolicy';

describe('validateNewPassword', () => {
  it('aceita senha válida e confirmação igual', () => {
    expect(validateNewPassword({ password: 'direito2026', confirmation: 'direito2026' })).toEqual(
      {},
    );
  });

  it('exige senha e confirmação', () => {
    expect(validateNewPassword({ password: '', confirmation: '' })).toEqual({
      password: 'Informe a senha.',
      confirmation: 'Confirme a senha.',
    });
  });

  it('aplica a política de tamanho, letras e números', () => {
    expect(validateNewPassword({ password: 'abc123', confirmation: 'abc123' }).password).toMatch(
      /pelo menos 8/,
    );
    expect(
      validateNewPassword({ password: 'a1'.repeat(37), confirmation: 'a1'.repeat(37) }).password,
    ).toMatch(/no máximo 72/);
    expect(
      validateNewPassword({ password: 'somenteletras', confirmation: 'somenteletras' }).password,
    ).toMatch(/letra e um número/);
    expect(
      validateNewPassword({ password: '1234567890', confirmation: '1234567890' }).password,
    ).toMatch(/letra e um número/);
    expect(validateNewPassword({ password: 'ÁguaÉ2026', confirmation: 'ÁguaÉ2026' })).toEqual({});
  });

  it('indica confirmação divergente', () => {
    expect(
      validateNewPassword({ password: 'direito2026', confirmation: 'direito2025' }).confirmation,
    ).toBe('As senhas não coincidem.');
  });
});
