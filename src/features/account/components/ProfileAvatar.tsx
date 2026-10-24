import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { usePhoto } from '../photos';
export function ProfileAvatar({
  email,
  name = '',
  size,
}: {
  email: string;
  name?: string;
  size?: number;
}) {
  const { photo } = usePhoto(email);
  return <Avatar src={photo} name={name} size={size} />;
}
