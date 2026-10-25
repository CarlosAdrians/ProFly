import { useState } from 'react';
import { TextField } from '../components/ui/TextField/TextField';
import { Icon } from '../components/ui/Icon/Icon';
import { Select } from './ui';
import { dayLabel } from './dates';
import type { ProfileData } from './types';
import s from './Portal.module.css';

type WindowData = NonNullable<ProfileData['availability']>['windows'][number];
const weekdays = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'].map(
  (name, i) => ({ id: String(i + 1), name }),
);
export function AvailabilityWindow({
  window,
  index,
  group,
  onChange,
  onRemove,
}: {
  window: WindowData;
  index: number;
  group: string;
  onChange: (values: Partial<WindowData>) => void;
  onRemove: () => void;
}) {
  const [expanded, setExpanded] = useState(!window.validFrom || !window.validUntil);
  return (
    <details
      className={s.availabilityWindow}
      name={group}
      open={expanded}
      onToggle={(e) => setExpanded(e.currentTarget.open)}
    >
      <summary>
        <Icon name="clock" size={22} />
        <div>
          <strong>
            {weekdays[window.weekday - 1]?.name ?? `Horário ${index + 1}`} ·{' '}
            {window.startsAt || 'Início'}–{window.endsAt || 'Fim'}
          </strong>
          <span>
            {window.validFrom && window.validUntil
              ? `${dayLabel(window.validFrom)} a ${dayLabel(window.validUntil)}`
              : 'Defina o período de disponibilidade'}
          </span>
        </div>
        <span className={s.availabilityChevron} aria-hidden="true" />
      </summary>
      <div className={s.availabilityEditor}>
        <div className={s.availabilityFields}>
          <Select
            label="Dia da semana"
            value={String(window.weekday)}
            items={weekdays}
            onChange={(v) => onChange({ weekday: Number(v) })}
          />
          <TextField
            label="Início"
            type="time"
            required
            value={window.startsAt}
            onChange={(e) => onChange({ startsAt: e.target.value })}
          />
          <TextField
            label="Fim"
            type="time"
            required
            min={window.startsAt || undefined}
            value={window.endsAt}
            onChange={(e) => onChange({ endsAt: e.target.value })}
          />
          <TextField
            label="Válido de"
            type="date"
            required
            value={window.validFrom}
            max={window.validUntil || undefined}
            onChange={(e) => onChange({ validFrom: e.target.value })}
          />
          <TextField
            label="Válido até"
            type="date"
            required
            min={window.validFrom || undefined}
            value={window.validUntil}
            onChange={(e) => onChange({ validUntil: e.target.value })}
          />
        </div>
        <button type="button" className={s.removeAvailability} onClick={onRemove}>
          <Icon name="trash" size={16} />
          Remover horário
        </button>
      </div>
    </details>
  );
}
