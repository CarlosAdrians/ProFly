const tones = ['blue', 'mint', 'violet', 'orange', 'pink', 'cyan', 'olive', 'indigo'] as const;

/** Stable across dates, filters and reloads; no dependence on the result order. */
export function calendarSubjectTone(course: string, subject: string) {
  const key = [course, subject]
    .map((value) =>
      value
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .trim()
        .toLocaleLowerCase('pt-BR')
        .replace(/\s+/g, ' '),
    )
    .join(':');
  let hash = 2166136261;
  for (const character of key) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619);
  return tones[(hash >>> 0) % tones.length]!;
}
