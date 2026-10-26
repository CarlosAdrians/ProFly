import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/global.css';
import { EntryApp } from './app/EntryApp';
import { applyTheme, preferredDark } from './components/ui/ThemeToggle/theme';
applyTheme(preferredDark());
createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <EntryApp />
  </StrictMode>,
);
