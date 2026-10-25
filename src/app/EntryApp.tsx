import { lazy, Suspense } from 'react';
import { demoEnvironmentAllowed } from './demoEnvironment';
const DemoApp = lazy(() => import('./App').then((m) => ({ default: m.App })));
const ConnectedApp = lazy(() =>
  import('../institutional/ApiApp').then((m) => ({ default: m.ApiApp })),
);
export function EntryApp() {
  return demoEnvironmentAllowed(window.location.hostname) ? (
    <Suspense fallback={<p role="status">Carregando ProFly…</p>}>
      {import.meta.env.VITE_DEMO_MODE === 'true' ? <DemoApp /> : <ConnectedApp />}
    </Suspense>
  ) : (
    <main className="environmentNotice">
      <img src="/images/unifacisa-symbol.png" alt="UNIFACISA" width="50" height="50" />
      <h1>Acesso institucional ainda não configurado</h1>
      <p>
        O acesso público deste ambiente de desenvolvimento depende da homologação da instituição e
        da configuração de hospedagem e segurança.
      </p>
    </main>
  );
}
