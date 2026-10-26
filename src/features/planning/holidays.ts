import { useEffect, useState } from 'react';

export interface Holiday {
  date: string;
  name: string;
  scope: 'Nacional' | 'Paraíba' | 'Confirmar localmente';
  source: string;
}
export const PB_SOURCE =
  'https://codata.pb.gov.br/mural-de-avisos/reparticoes-estaduais-fecham-no-feriado-do-dia-5-de-agosto';
const nationalDates = new Set([
  '01-01',
  '04-21',
  '05-01',
  '09-07',
  '10-12',
  '11-02',
  '11-15',
  '11-20',
  '12-25',
]);
const ttl = 24 * 60 * 60 * 1000;
const keyFor = (year: number) => `profly:holidays:v1:${year}`;

export function paraibaHoliday(year: number): Holiday {
  return {
    date: `${year}-08-05`,
    name: 'Data Magna da Paraíba',
    scope: 'Paraíba',
    source: PB_SOURCE,
  };
}
export function parseHolidays(value: unknown, year: number): Holiday[] {
  if (!Array.isArray(value) || !value.length) throw new Error('Resposta de feriados inválida.');
  return value.map((item: unknown) => {
    if (!item || typeof item !== 'object') throw new Error('Feriado inválido.');
    const row = item as Record<string, unknown>;
    if (
      typeof row.date !== 'string' ||
      !row.date.startsWith(`${year}-`) ||
      !/^\d{4}-\d{2}-\d{2}$/.test(row.date) ||
      typeof row.name !== 'string' ||
      !row.name.trim() ||
      row.name.length > 160 ||
      new Date(`${row.date}T12:00:00Z`).toISOString().slice(0, 10) !== row.date
    )
      throw new Error('Feriado inválido.');
    return {
      date: row.date,
      name: row.name,
      scope: nationalDates.has(row.date.slice(5)) ? 'Nacional' : 'Confirmar localmente',
      source: 'https://brasilapi.com.br/docs#tag/Feriados-Nacionais',
    };
  });
}
function cached(year: number): { at: number; items: Holiday[] } | undefined {
  try {
    const row = JSON.parse(localStorage.getItem(keyFor(year)) ?? 'null');
    if (!row || typeof row.at !== 'number' || row.at > Date.now()) return;
    return { at: row.at, items: parseHolidays(row.items, year) };
  } catch {
    return;
  }
}
export async function loadHolidays(
  year: number,
  signal?: AbortSignal,
): Promise<{ items: Holiday[]; status: string }> {
  const pb = paraibaHoliday(year);
  const before = cached(year);
  if (before && Date.now() - before.at < ttl)
    return {
      items: [...before.items, pb],
      status: 'BrasilAPI · consulta salva há menos de 24 horas',
    };
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  const timeout = setTimeout(abort, 8000);
  try {
    const response = await fetch(`https://brasilapi.com.br/api/feriados/v1/${year}`, {
      signal: controller.signal,
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
    });
    if (!response.ok) throw new Error('Feriados indisponíveis.');
    const items = parseHolidays(await response.json(), year);
    let status = 'BrasilAPI · consulta atualizada';
    try {
      localStorage.setItem(keyFor(year), JSON.stringify({ at: Date.now(), items }));
    } catch {
      status += ' · sem cache neste navegador';
    }
    return { items: [...items, pb], status };
  } catch {
    if (signal?.aborted) throw new DOMException('Consulta cancelada', 'AbortError');
    return {
      items: [...(before?.items ?? []), pb],
      status: before
        ? 'Consulta indisponível · exibindo dados anteriores, que podem estar desatualizados'
        : 'Consulta indisponível · feriados nacionais ainda não carregados',
    };
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}
export function useHolidays(year: number, enabled = true) {
  const [state, setState] = useState({
    year,
    items: [paraibaHoliday(year)],
    status: 'Consultando feriados…',
  });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    if (!enabled) return;
    const controller = new AbortController();
    void loadHolidays(year, controller.signal)
      .then((result) => {
        if (!controller.signal.aborted) setState({ year, ...result });
      })
      .catch(() => {
        /* Unmounted request. */
      });
    return () => controller.abort();
  }, [year, revision, enabled]);
  return {
    items: !enabled ? [] : state.year === year ? state.items : [paraibaHoliday(year)],
    status: !enabled
      ? 'Feriados ocultos nas preferências'
      : state.year === year
        ? state.status
        : 'Consultando feriados…',
    refresh: () => {
      try {
        localStorage.removeItem(keyFor(year));
      } catch {
        /* Network refresh can still proceed. */
      }
      setRevision((value) => value + 1);
    },
  };
}
