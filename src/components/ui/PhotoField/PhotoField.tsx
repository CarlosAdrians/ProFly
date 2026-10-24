import { useId, useRef, useState, type ChangeEvent } from 'react';
import { Avatar } from '../Avatar/Avatar';
import { Button } from '../Button/Button';
import styles from './PhotoField.module.css';
import { validatePhoto } from './validation';

async function preparePhoto(file: File): Promise<string> {
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    if (
      !image.naturalWidth ||
      !image.naturalHeight ||
      image.naturalWidth * image.naturalHeight > 40000000
    )
      throw new Error();
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 256;
    const context = canvas.getContext('2d');
    if (!context) throw new Error();
    context.fillStyle = '#ffffff';
    context.fillRect(0, 0, 256, 256);
    const side = Math.min(image.naturalWidth, image.naturalHeight);
    context.drawImage(
      image,
      (image.naturalWidth - side) / 2,
      (image.naturalHeight - side) / 2,
      side,
      side,
      0,
      0,
      256,
      256,
    );
    return canvas.toDataURL('image/jpeg', 0.85);
  } finally {
    URL.revokeObjectURL(url);
  }
}
export function PhotoField({
  value,
  onChange,
}: {
  value?: string;
  onChange: (value?: string) => void | Promise<void>;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string>();
  const [loading, setLoading] = useState(false);
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    const invalid = validatePhoto(file);
    setError(invalid);
    if (invalid) {
      event.target.value = '';
      return;
    }
    setLoading(true);
    try {
      await onChange(await preparePhoto(file));
    } catch {
      setError(
        'Não foi possível usar essa imagem. Tente outro arquivo ou verifique o espaço no navegador.',
      );
    } finally {
      setLoading(false);
      if (input.current) input.current.value = '';
    }
  }
  return (
    <div className={styles.field}>
      <Avatar size={80} src={value} name="Sua foto de perfil" />
      <div>
        <span className={styles.label}>
          Foto de perfil <span>(opcional)</span>
        </span>
        <div className={styles.actions}>
          <Button
            variant="secondary"
            onClick={() => input.current?.click()}
            loading={loading}
            loadingText="Preparando foto…"
          >
            {value ? 'Trocar foto' : 'Adicionar foto'}
          </Button>
          {value && (
            <Button
              variant="secondary"
              onClick={async () => {
                try {
                  await onChange(undefined);
                  setError(undefined);
                } catch {
                  setError('Não foi possível remover a foto.');
                }
              }}
            >
              Remover foto
            </Button>
          )}
        </div>
        <input
          ref={input}
          id={id}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          aria-label="Selecionar foto de perfil"
          className="visually-hidden"
          tabIndex={-1}
          onChange={select}
        />
        <p className={styles.hint}>
          JPG, PNG ou WebP, até 2 MB. Você pode removê-la quando quiser.
        </p>
        {error && (
          <p role="alert" className={styles.error}>
            {error}
          </p>
        )}
      </div>
    </div>
  );
}
