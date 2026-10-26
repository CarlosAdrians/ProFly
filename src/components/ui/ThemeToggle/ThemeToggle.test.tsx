import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ThemeToggle } from './ThemeToggle';
import { THEME_KEY } from './theme';
it('alterna pelo teclado, persiste e restaura o modo escuro ao remontar', async () => {
  localStorage.setItem(THEME_KEY, 'light');
  const user = userEvent.setup();
  const view = render(<ThemeToggle />);
  const toggle = screen.getByRole('switch', { name: 'Modo escuro' });
  expect(toggle).toHaveAttribute('aria-checked', 'false');
  toggle.focus();
  await user.keyboard(' ');
  expect(toggle).toHaveAttribute('aria-checked', 'true');
  expect(document.documentElement.dataset.theme).toBe('dark');
  expect(localStorage.getItem(THEME_KEY)).toBe('dark');
  view.unmount();
  render(<ThemeToggle />);
  expect(screen.getByRole('switch')).toHaveAttribute('aria-checked', 'true');
});
