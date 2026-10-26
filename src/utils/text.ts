/** Normaliza texto para busca: minúsculas e sem acentos. */
export function normalizeForSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim();
}

export function matchesSearch(value: string, query: string): boolean {
  return normalizeForSearch(value).includes(normalizeForSearch(query));
}
