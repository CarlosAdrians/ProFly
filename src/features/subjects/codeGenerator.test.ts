import { nextSubjectCode } from './codeGenerator';
import { subjectsSeed } from '../../mocks/subjects';

describe('nextSubjectCode', () => {
  it('gera DIR502 a partir dos 12 códigos fictícios (maior + 1)', () => {
    expect(nextSubjectCode(subjectsSeed.map((subject) => subject.code))).toBe('DIR502');
  });

  it('considera códigos de disciplinas inativas', () => {
    // DIR501 (Ética Profissional) está inativa e ainda assim é o maior número.
    const inactive = subjectsSeed.filter((subject) => subject.status === 'inactive');
    expect(inactive.map((subject) => subject.code)).toContain('DIR501');
    expect(nextSubjectCode(['DIR101', 'DIR501'])).toBe('DIR502');
  });

  it('não reaproveita números vagos', () => {
    expect(nextSubjectCode(['DIR101', 'DIR103', 'DIR301'])).toBe('DIR302');
  });

  it('começa em DIR001 quando não há códigos no formato', () => {
    expect(nextSubjectCode([])).toBe('DIR001');
    expect(nextSubjectCode(['DIR-601', 'ABC123'])).toBe('DIR001');
  });

  it('ignora maiúsculas e espaços nos códigos existentes', () => {
    expect(nextSubjectCode([' dir210 '])).toBe('DIR211');
  });

  it('mantém no mínimo 3 dígitos e segue após 999', () => {
    expect(nextSubjectCode(['DIR7'])).toBe('DIR008');
    expect(nextSubjectCode(['DIR999'])).toBe('DIR1000');
  });

  it('nunca repete um código existente', () => {
    // DIR008 existe com zeros à esquerda diferentes do número máximo calculado.
    expect(nextSubjectCode(['DIR7', 'DIR008'])).toBe('DIR009');
  });
});
