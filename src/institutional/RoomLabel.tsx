import { Icon } from '../components/ui/Icon/Icon';
import s from './RoomLabel.module.css';

export function RoomLabel({ room }: { room?: string | null }) {
  return (
    <span className={s.label}>
      <Icon name="door" size={14} />
      <span>{room ? (/^sala\s/i.test(room) ? room : `Sala ${room}`) : 'Sala a definir'}</span>
    </span>
  );
}
