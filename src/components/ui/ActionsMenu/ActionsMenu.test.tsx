import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ActionsMenu } from './ActionsMenu';

function setup() {
  const onEdit = vi.fn();
  const onToggle = vi.fn();
  render(
    <>
      <ActionsMenu
        label="Opções de Ana"
        actions={[
          { label: 'Editar', onSelect: onEdit },
          { label: 'Inativar', onSelect: onToggle },
        ]}
      />
      <button type="button">Fora</button>
    </>,
  );
  return { user: userEvent.setup(), onEdit, onToggle };
}

describe('ActionsMenu', () => {
  it('abre, foca o primeiro item e navega com as setas', async () => {
    const { user, onToggle } = setup();
    const trigger = screen.getByRole('button', { name: 'Opções de Ana' });
    await user.click(trigger);
    expect(trigger).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Inativar' })).toHaveFocus();
    await user.keyboard('{ArrowDown}');
    expect(screen.getByRole('menuitem', { name: 'Editar' })).toHaveFocus();
    await user.keyboard('{ArrowUp}{Enter}');
    expect(onToggle).toHaveBeenCalledOnce();
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('fecha com Esc e devolve o foco', async () => {
    const { user } = setup();
    const trigger = screen.getByRole('button', { name: 'Opções de Ana' });
    await user.click(trigger);
    await user.keyboard('{Escape}');
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('fecha ao clicar fora', async () => {
    const { user, onEdit } = setup();
    await user.click(screen.getByRole('button', { name: 'Opções de Ana' }));
    await user.click(screen.getByRole('button', { name: 'Fora' }));
    expect(screen.queryByRole('menu')).not.toBeInTheDocument();
    expect(onEdit).not.toHaveBeenCalled();
  });
});
