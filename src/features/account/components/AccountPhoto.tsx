import { useEffect, useRef, useState, type ChangeEvent, type FormEvent } from 'react';
import { Avatar } from '../../../components/ui/Avatar/Avatar';
import { Button } from '../../../components/ui/Button/Button';
import { Icon } from '../../../components/ui/Icon/Icon';
import { Modal } from '../../../components/ui/Modal/Modal';
import { Alert } from '../../../components/ui/Alert/Alert';
import {
  centeredCrop,
  drawPhoto,
  encodePhoto,
  openPhoto,
  reopenPhoto,
  type CropSettings,
} from '../photoEditor';
import styles from './AccountPhoto.module.css';

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return [parts[0]?.[0], parts.length > 1 ? parts.at(-1)?.[0] : ''].join('').toUpperCase() || 'PF';
}

function PhotoEditor({
  value,
  name,
  onChange,
  onClose,
  onBusy,
}: {
  value?: string;
  name: string;
  onChange: (value?: string) => void | Promise<void>;
  onClose: () => void;
  onBusy: (busy: boolean) => void;
}) {
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [crop, setCrop] = useState<CropSettings>(centeredCrop);
  const [failure, setFailure] = useState('');
  const [working, setWorking] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLCanvasElement>(null);
  const resource = useRef<{ release: () => void } | null>(null);
  const active = useRef(true);
  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      resource.current?.release();
    };
  }, []);
  useEffect(() => {
    if (image && preview.current) drawPhoto(preview.current, image, crop);
  }, [image, crop]);

  async function load(file?: File) {
    if (working) return;
    setWorking(true);
    onBusy(true);
    setFailure('');
    try {
      const next = file ? await openPhoto(file) : await reopenPhoto(value ?? '');
      if (!active.current) {
        next.release();
        return;
      }
      try {
        const probe = document.createElement('canvas');
        probe.width = probe.height = 1;
        drawPhoto(probe, next.image, centeredCrop);
      } catch (error) {
        next.release();
        throw error;
      }
      resource.current?.release();
      resource.current = next;
      setImage(next.image);
      setCrop(centeredCrop);
    } catch (error) {
      if (active.current)
        setFailure(
          error instanceof Error && !(error instanceof DOMException) && error.message
            ? error.message
            : 'Não foi possível abrir a imagem. Escolha outro arquivo.',
        );
    } finally {
      if (active.current) {
        setWorking(false);
        onBusy(false);
      }
      if (fileInput.current) fileInput.current.value = '';
    }
  }
  async function select(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (file) await load(file);
  }
  async function persist(remove = false) {
    if (working || (!remove && !image)) return;
    setWorking(true);
    onBusy(true);
    setFailure('');
    try {
      await onChange(remove ? undefined : encodePhoto(image!, crop));
      onClose();
    } catch {
      setFailure(
        'Não foi possível salvar a foto. A imagem anterior foi preservada. Tente novamente.',
      );
    } finally {
      if (active.current) {
        setWorking(false);
        onBusy(false);
      }
    }
  }
  function submit(event: FormEvent) {
    event.preventDefault();
    void persist();
  }
  return (
    <form onSubmit={submit} className={styles.editor}>
      <header>
        <h2>Foto de perfil</h2>
        <p>Escolha uma imagem e ajuste o enquadramento.</p>
      </header>
      {failure && <Alert variant="error">{failure}</Alert>}
      <div className={styles.preview}>
        {image ? (
          <canvas
            ref={preview}
            width={512}
            height={512}
            role="img"
            aria-label="Prévia do enquadramento da foto"
          />
        ) : value ? (
          <Avatar src={value} size={200} name="Foto de perfil atual" />
        ) : (
          <span className={styles.initials}>{initials(name)}</span>
        )}
      </div>
      <div className={styles.choose}>
        <Button
          variant="secondary"
          disabled={working}
          onClick={() => fileInput.current?.click()}
          data-autofocus
        >
          <Icon name="upload" />
          {image ? 'Escolher outra imagem' : 'Escolher imagem'}
        </Button>
        {!image && value && (
          <button
            type="button"
            className={styles.textButton}
            disabled={working}
            onClick={() => void load()}
          >
            <Icon name="edit" />
            Ajustar foto atual
          </button>
        )}
      </div>
      <input
        ref={fileInput}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        aria-label="Selecionar foto de perfil"
        className="visually-hidden"
        tabIndex={-1}
        disabled={working}
        onChange={select}
      />
      <p className={styles.hint}>JPG, PNG ou WebP, até 2 MB. Sua foto é opcional.</p>
      {image && (
        <fieldset className={styles.controls} disabled={working}>
          <legend>Enquadramento</legend>
          <label>
            Ampliar foto
            <input
              type="range"
              min="1"
              max="3"
              step="0.05"
              value={crop.zoom}
              onChange={(event) => setCrop({ ...crop, zoom: Number(event.target.value) })}
            />
          </label>
          <label>
            Posição horizontal
            <input
              type="range"
              min="0"
              max="100"
              value={crop.horizontal}
              onChange={(event) => setCrop({ ...crop, horizontal: Number(event.target.value) })}
            />
          </label>
          <label>
            Posição vertical
            <input
              type="range"
              min="0"
              max="100"
              value={crop.vertical}
              onChange={(event) => setCrop({ ...crop, vertical: Number(event.target.value) })}
            />
          </label>
          <button type="button" className={styles.textButton} onClick={() => setCrop(centeredCrop)}>
            <Icon name="reset" />
            Centralizar imagem
          </button>
        </fieldset>
      )}
      <div role="status" className={styles.progress}>
        {working ? 'Processando foto…' : ''}
      </div>
      <footer className={styles.actions}>
        {value && (
          <button
            className={styles.remove}
            type="button"
            aria-label="Remover foto"
            title="Remover foto"
            disabled={working}
            onClick={() => void persist(true)}
          >
            <Icon name="trash" />
          </button>
        )}
        <div>
          <Button variant="secondary" disabled={working} onClick={onClose}>
            <Icon name="close" />
            Cancelar
          </Button>
          <Button type="submit" disabled={!image} loading={working} loadingText="Processando…">
            <Icon name="save" />
            Salvar foto
          </Button>
        </div>
      </footer>
    </form>
  );
}

export function AccountPhoto({
  value,
  name,
  onChange,
  disabled = false,
}: {
  value?: string;
  name: string;
  onChange: (value?: string) => void | Promise<void>;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const close = () => {
    setOpen(false);
    setBusy(false);
  };
  return (
    <>
      <button
        type="button"
        className={styles.avatarButton}
        onClick={() => setOpen(true)}
        disabled={disabled}
        aria-label="Editar foto de perfil"
        aria-haspopup="dialog"
      >
        {value ? (
          <Avatar src={value} size={96} name="" />
        ) : (
          <span className={styles.initials}>{initials(name)}</span>
        )}
        <span className={styles.camera}>
          <Icon name="camera" size={17} />
        </span>
      </button>
      <Modal open={open} title="Editar foto de perfil" busy={busy} onClose={close}>
        <PhotoEditor
          value={value}
          name={name}
          onChange={onChange}
          onClose={close}
          onBusy={setBusy}
        />
      </Modal>
    </>
  );
}
