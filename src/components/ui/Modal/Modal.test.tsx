import { fireEvent, render, screen } from '@testing-library/react';
import { vi } from 'vitest';
import { Modal } from './Modal';
it('bloqueia fechar durante salvamento e permite cancelar depois', () => {
  const close = vi.fn();
  const view = render(
    <Modal open busy title="Teste" onClose={close}>
      <input aria-label="Nome" data-autofocus />
    </Modal>,
  );
  expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(close).not.toHaveBeenCalled();
  view.rerender(
    <Modal open title="Teste" onClose={close}>
      <input aria-label="Nome" />
    </Modal>,
  );
  fireEvent(screen.getByRole('dialog'), new Event('cancel', { cancelable: true }));
  expect(close).toHaveBeenCalledTimes(1);
});
