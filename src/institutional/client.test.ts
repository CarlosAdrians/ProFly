import { lessonDayPart } from './calendarShifts';
import { calendarSubjectTone } from './calendarColors';
import { describe, it, expect, vi } from 'vitest';
import { api, ApiError, setCsrf } from './api';
import { addDate, moveMeeting } from './calendarModel';
import type { Allocation } from './types';
describe('cliente HTTP institucional', () => {
  it('usa cookie, CSRF em comandos e corpo tipado sem guardar credenciais', async () => {
    const fetch = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal('fetch', fetch);
    setCsrf('synthetic-csrf');
    await api('/me/photo', { method: 'DELETE', body: {} });
    expect(fetch).toHaveBeenCalledWith(
      '/api/v1/me/photo',
      expect.objectContaining({
        credentials: 'include',
        method: 'DELETE',
        headers: expect.objectContaining({ 'x-csrf-token': 'synthetic-csrf' }),
      }),
    );
    setCsrf('');
  });
  it('mantém erro estruturado sem sucesso ou fallback local em falha de rede', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            error: {
              code: 'STALE_VERSION',
              message: 'Atualize os dados.',
              fieldErrors: { education: ['Confira a formação.'] },
            },
          }),
          { status: 409 },
        ),
      ),
    );
    await expect(
      api('/me/profile', { method: 'PUT', body: { expectedVersion: 1, data: {} } }),
    ).rejects.toMatchObject({
      status: 409,
      code: 'STALE_VERSION',
      fieldErrors: { education: ['Confira a formação.'] },
    });
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('raw provider detail')));
    try {
      await api('/courses');
      throw new Error('expected failure');
    } catch (error) {
      expect(error).toBeInstanceOf(ApiError);
      expect((error as Error).message).not.toContain('raw provider detail');
    }
  });
});
describe('movimentação de um encontro recorrente', () => {
  it('move somente a ocorrência escolhida, preservando semanas e os dados anteriores', () => {
    const meeting = {
      id: 'meeting',
      weekday: 1,
      startsAt: '18:30',
      endsAt: '19:20',
      validFrom: '2030-01-07',
      validUntil: '2030-01-28',
    };
    const record = { meetings: [meeting] } as Allocation;
    const next = moveMeeting(record, '2030-01-14', '2030-01-15');
    expect(next).toHaveLength(3);
    expect(next.map((m) => [m.validFrom, m.validUntil])).toEqual([
      ['2030-01-07', '2030-01-13'],
      ['2030-01-15', '2030-01-28'],
      ['2030-01-15', '2030-01-15'],
    ]);
    expect(next.at(-1)?.weekday).toBe(2);
    expect(record.meetings).toEqual([meeting]);
    expect(new Set(next.map((m) => m.id)).size).toBe(3);
    expect(addDate('2030-01-31', 1)).toBe('2030-02-01');
  });
  it('não cria encontro duplicado ao soltar na mesma data e rejeita origem obsoleta', () => {
    const record = {
      meetings: [
        {
          id: 'only',
          weekday: 1,
          startsAt: '18:30',
          endsAt: '19:20',
          validFrom: '2030-01-07',
          validUntil: '2030-01-07',
        },
      ],
    } as Allocation;
    expect(moveMeeting(record, '2030-01-07', '2030-01-07')).toBe(record.meetings);
    expect(moveMeeting(record, '2030-01-07', '2030-01-08')).toHaveLength(1);
    expect(() => moveMeeting(record, '2030-01-08', '2030-01-09')).toThrow('encontro mudou');
  });
});

describe('icones dos turnos no fuso institucional', () => {
  it('mantem os limites de meio-dia, noite e meia-noite em America/Fortaleza', () => {
    expect(lessonDayPart('2026-10-26T14:59:00Z')).toMatchObject({
      id: 'MORNING',
      icon: 'sunrise',
      label: 'Manhã',
    });
    expect(lessonDayPart('2026-10-26T15:00:00Z')).toMatchObject({ id: 'AFTERNOON', icon: 'sun' });
    expect(lessonDayPart('2026-10-26T20:59:00Z').id).toBe('AFTERNOON');
    expect(lessonDayPart('2026-10-26T21:00:00Z')).toMatchObject({ id: 'NIGHT', icon: 'moon' });
    expect(lessonDayPart('2026-10-27T02:59:00Z').id).toBe('NIGHT');
    expect(lessonDayPart('2026-10-27T03:00:00Z').id).toBe('MORNING');
  });
});

describe('cores das disciplinas no calendario pessoal', () => {
  it('distingue as tres disciplinas do checklist e preserva identidade sem depender da ordem', () => {
    const subjects = ['Direito Civil I', 'Direito Civil II', 'Prática Contratual'];
    const forward = subjects.map((subject) => calendarSubjectTone('Direito', subject));
    expect(new Set(forward).size).toBe(3);
    expect(
      [...subjects].reverse().map((subject) => calendarSubjectTone('Direito', subject)),
    ).toEqual([...forward].reverse());
    expect(calendarSubjectTone(' Direito ', ' PRATICA  CONTRATUAL ')).toBe(
      calendarSubjectTone('Direito', 'Prática Contratual'),
    );
  });
});
