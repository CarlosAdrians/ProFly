import { matchesSearch } from './text';

describe('busca', () => {
  it('ignora maiúsculas, acentos e espaços nas pontas', () => {
    expect(matchesSearch('João Pedro Santos', ' joao ')).toBe(true);
    expect(matchesSearch('Camila Nóbrega', 'NOBREGA')).toBe(true);
    expect(matchesSearch('Ana Beatriz Lima', 'bruno')).toBe(false);
    expect(matchesSearch('Ana', '')).toBe(true);
  });
});
