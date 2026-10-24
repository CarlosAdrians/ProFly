import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { App } from './app/App';
import { applyTheme, preferredDark } from './components/ui/ThemeToggle/theme';
import { demoEnvironmentAllowed } from './app/demoEnvironment';

applyTheme(preferredDark());

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {demoEnvironmentAllowed(window.location.hostname) ? (
      <App />
    ) : (
      <main className="environmentNotice">
        <img src="/images/unifacisa-symbol.png" alt="UNIFACISA" width="50" height="50" />
        <h1>Acesso institucional ainda não configurado</h1>
        <p>
          Esta versão usa uma demonstração local. O acesso público depende da integração com a
          autenticação e os serviços institucionais.
        </p>
      </main>
    )}
  </StrictMode>,
);
