import { cancelPlan, getPlans, movePlan, PLANS_KEY, savePlan, type PlanInput } from './service';
const input = (changes: Partial<PlanInput> = {}): PlanInput => ({
  courseId: 'direito',
  subject: 'Direito Civil I',
  teacherId: 't01',
  group: 'Turma A',
  date: '2026-11-02',
  start: '18:30',
  end: '19:20',
  note: '',
  ...changes,
});
beforeEach(() => localStorage.setItem(PLANS_KEY, '[]'));
describe('rascunhos compartilhados entre calendario e lista', () => {
  it('recusa conflito de professor entre cursos e permite adjacencia', async () => {
    await savePlan(input({ teacherId: 't02' }));
    await expect(
      savePlan(
        input({
          courseId: 'sistemas',
          subject: 'Banco de Dados',
          teacherId: 't02',
          group: 'Turma B',
        }),
      ),
    ).rejects.toThrow(/outro curso/);
    const adjacent = await savePlan(
      input({
        courseId: 'sistemas',
        subject: 'Banco de Dados',
        teacherId: 't02',
        group: 'Turma B',
        start: '19:20',
        end: '20:10',
      }),
    );
    expect(adjacent.version).toBe(1);
    expect(getPlans()).toHaveLength(2);
  });
  it('uma movimentacao invalida preserva o estado anterior da aula e da turma', async () => {
    const first = await savePlan(input());
    const second = await savePlan(input({ teacherId: 't02', start: '19:20', end: '20:10' }));
    const before = localStorage.getItem(PLANS_KEY);
    await expect(movePlan(second, first.date, '18:30', '19:20')).rejects.toThrow(/turma/);
    expect(localStorage.getItem(PLANS_KEY)).toBe(before);
  });
  it('cartao sem horario pode ser alocado, e versao antiga nao sobrescreve a movimentacao', async () => {
    const pin = await savePlan(input({ date: '', start: '', end: '' }));
    expect(pin.date).toBe('');
    const moved = await movePlan(pin, '2026-11-03', '18:30', '19:20');
    expect(moved.id).toBe(pin.id);
    expect(moved.version).toBe(2);
    await expect(savePlan(input(), pin.id, 1)).rejects.toThrow(/mudou/);
    cancelPlan(moved);
    expect(getPlans()[0].state).toBe('CANCELLED');
    expect(getPlans()[0].version).toBe(3);
  });
  it('recusa referencias inativas e datas ou horarios incoerentes', async () => {
    for (const value of [
      input({ date: '2026-02-30' }),
      input({ start: '22:00', end: '01:00' }),
      input({ subject: 'Disciplina inexistente' }),
      input({ teacherId: 't05' }),
      input({ date: '', start: '18:30' }),
    ])
      await expect(savePlan(value)).rejects.toThrow();
    expect(getPlans()).toEqual([]);
  });
  it('dados corrompidos nao sao silenciosamente substituidos pelos exemplos', async () => {
    localStorage.setItem(PLANS_KEY, '{invalid');
    expect(() => getPlans()).toThrow(/preservados/);
    await expect(savePlan(input())).rejects.toThrow(/preservados/);
    expect(localStorage.getItem(PLANS_KEY)).toBe('{invalid');
  });
});
