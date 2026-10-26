import { Link } from 'react-router';
import { Button } from '../components/ui/Button/Button';
import { Icon } from '../components/ui/Icon/Icon';
import { StudyIllustration } from '../components/illustrations/StudyIllustration';
import s from './StatusPage.module.css';

type PageState = 'notFound' | 'loading' | 'maintenance' | 'unavailable' | 'error';
const copy = {
  notFound: {
    label: 'Página não encontrada',
    title: 'Essa página ficou fora da agenda.',
    text: 'O endereço pode ter mudado ou não existir. Volte ao seu espaço acadêmico para continuar.',
    scene: 'missing',
  },
  loading: {
    label: 'Preparando seu espaço',
    title: 'Abrindo seu próximo capítulo.',
    text: 'Estamos organizando as informações do seu espaço acadêmico. Só um instante.',
    scene: 'history',
  },
  maintenance: {
    label: 'Manutenção',
    title: 'Uma pausa para cuidar do seu espaço.',
    text: 'O ProFly está temporariamente em manutenção. Tente acessar novamente em alguns instantes.',
    scene: 'maintenance',
  },
  unavailable: {
    label: 'Conexão indisponível',
    title: 'Não conseguimos abrir seu espaço agora.',
    text: 'Confira sua conexão e tente novamente. Não foi possível acessar o servidor neste momento.',
    scene: 'maintenance',
  },
  error: {
    label: 'Algo interrompeu a navegação',
    title: 'Não foi possível abrir esta tela',
    text: 'Tente carregar novamente ou volte ao início. Os dados salvos não foram apagados. Alterações ainda não salvas podem precisar ser preenchidas novamente.',
    scene: 'missing',
  },
} as const;

export function StatusPage({ state, onRetry }: { state: PageState; onRetry?: () => void }) {
  const content = copy[state];
  return (
    <main className={s.page}>
      <title>{content.label} | ProFly</title>
      <header className={s.brand}>
        <img src="/images/unifacisa-logo.png" alt="UNIFACISA Centro Universitário" />
        <span>
          ProFly <span>/ Espaço acadêmico</span>
        </span>
      </header>
      <section
        className={s.content}
        aria-labelledby="state-title"
        role={state === 'loading' ? 'status' : undefined}
      >
        <div className={`${s.artwork} ${state === 'loading' ? s.loadingArt : ''}`}>
          <StudyIllustration scene={content.scene} />
        </div>
        <p className={s.label}>{content.label}</p>
        <h1 id="state-title">{content.title}</h1>
        <p className={s.description}>{content.text}</p>
        {state === 'loading' ? (
          <div className={s.progress} aria-hidden="true">
            <span />
          </div>
        ) : (
          <div className={s.actions}>
            {state !== 'notFound' && (
              <Button onClick={onRetry ?? (() => window.location.reload())}>
                <Icon name="reset" />
                Tentar novamente
              </Button>
            )}
            <Link className={state === 'notFound' ? s.primaryLink : s.backLink} to="/inicio">
              <Icon name="arrowLeft" size={18} />
              Voltar ao início
            </Link>
          </div>
        )}
      </section>
      <footer className={s.footer}>
        Seu espaço de gestão docente.<span>UNIFACISA · ProFly</span>
      </footer>
    </main>
  );
}

export function LoadingPlaceholder({ label = 'Carregando suas informações…' }: { label?: string }) {
  return (
    <div className={s.placeholder} role="status">
      <span className={s.spinner} aria-hidden="true" />
      <span>{label}</span>
    </div>
  );
}
