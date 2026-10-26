import { useEffect, useState } from 'react';
import { Modal } from '../../../components/ui/Modal/Modal';
import { TextField } from '../../../components/ui/TextField/TextField';
import { Button } from '../../../components/ui/Button/Button';
import { buildInvitePath } from '../../../app/paths';
import type { Teacher } from '../../teachers/types';
import { getOrCreateInvite } from '../services/inviteService';
import styles from './InviteLinkModal.module.css';

interface InviteLinkModalProps {
  /** Professor que receberá o convite; ausente fecha o modal. */
  teacher?: Teacher;
  onClose: () => void;
}

/** Gera o link de convite do professor para o coordenador copiar e enviar manualmente. */
export function InviteLinkModal({ teacher, onClose }: InviteLinkModalProps) {
  return (
    <Modal open={Boolean(teacher)} onClose={onClose} title="Convite de acesso">
      {teacher && <InviteLink key={teacher.id} teacher={teacher} />}
    </Modal>
  );
}

function InviteLink({ teacher }: { teacher: Teacher }) {
  const [link, setLink] = useState<string>();
  const [copyStatus, setCopyStatus] = useState<'copied' | 'failed'>();

  useEffect(() => {
    let active = true;
    getOrCreateInvite(teacher).then((invite) => {
      if (active) setLink(`${window.location.origin}${buildInvitePath(invite.token)}`);
    });
    return () => {
      active = false;
    };
  }, [teacher]);

  async function copy() {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopyStatus('copied');
    } catch {
      setCopyStatus('failed');
    }
  }

  return (
    <div className={styles.content}>
      <p className={styles.title} aria-hidden="true">
        Convite de acesso
      </p>
      <p className={styles.text}>
        Link para <strong>{teacher.name}</strong> ({teacher.email}) criar a própria senha. Copie e
        envie manualmente ao professor.
      </p>
      <TextField
        label="Link do convite:"
        readOnly
        aria-readonly="true"
        value={link ?? 'Gerando link…'}
        onFocus={(event) => event.currentTarget.select()}
      />
      <Button onClick={copy} disabled={!link} className={styles.copy}>
        Copiar link
      </Button>
      <div role="status" className={styles.status}>
        {copyStatus === 'copied' && 'Link copiado.'}
        {copyStatus === 'failed' &&
          'Não foi possível copiar automaticamente. Selecione o link e copie manualmente.'}
      </div>
      <p className={styles.note}>Envie o link somente ao professor indicado.</p>
    </div>
  );
}
