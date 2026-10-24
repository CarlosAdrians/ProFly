import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { AccountPhoto } from './AccountPhoto';
import * as processing from '../photoEditor';

const current = 'data:image/jpeg;base64,QUJD';
const next = 'data:image/jpeg;base64,REVG';
const image = { naturalWidth: 800, naturalHeight: 400 } as HTMLImageElement;
afterEach(() => vi.restoreAllMocks());

it('abre pelo avatar e cancela sem mudar a foto, devolvendo o foco', async () => {
  const user = userEvent.setup();
  const save = vi.fn();
  render(<AccountPhoto value={current} name="Docente de Teste" onChange={save} />);
  const avatar = screen.getByRole('button', { name: 'Editar foto de perfil' });
  await user.click(avatar);
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Escolher imagem' })).toHaveFocus();
  await user.click(screen.getByRole('button', { name: 'Cancelar' }));
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(avatar).toHaveFocus();
  expect(save).not.toHaveBeenCalled();
});

it('permite ajustar enquadramento e so persiste depois de salvar', async () => {
  const release = vi.fn();
  vi.spyOn(processing, 'openPhoto').mockResolvedValue({ image, release });
  vi.spyOn(processing, 'drawPhoto').mockImplementation(() => {});
  const encode = vi.spyOn(processing, 'encodePhoto').mockReturnValue(next);
  const user = userEvent.setup();
  const save = vi.fn();
  render(<AccountPhoto value={current} name="Docente de Teste" onChange={save} />);
  await user.click(screen.getByRole('button', { name: 'Editar foto de perfil' }));
  fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
    target: { files: [new File(['image'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
  await screen.findByRole('slider', { name: 'Ampliar foto' });
  fireEvent.change(screen.getByRole('slider', { name: 'Ampliar foto' }), {
    target: { value: '2' },
  });
  expect(save).not.toHaveBeenCalled();
  await user.click(screen.getByRole('button', { name: 'Salvar foto' }));
  expect(encode).toHaveBeenCalledWith(image, { zoom: 2, horizontal: 50, vertical: 50 });
  expect(save).toHaveBeenCalledWith(next);
  expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  expect(release).toHaveBeenCalled();
});

it('mantem a foto e a edicao quando a gravacao falha', async () => {
  vi.spyOn(processing, 'openPhoto').mockResolvedValue({ image, release: vi.fn() });
  vi.spyOn(processing, 'drawPhoto').mockImplementation(() => {});
  vi.spyOn(processing, 'encodePhoto').mockReturnValue(next);
  const user = userEvent.setup();
  const save = vi.fn().mockRejectedValue(new Error('quota'));
  render(<AccountPhoto value={current} name="Docente de Teste" onChange={save} />);
  await user.click(screen.getByRole('button', { name: 'Editar foto de perfil' }));
  fireEvent.change(screen.getByLabelText('Selecionar foto de perfil'), {
    target: { files: [new File(['image'], 'photo.jpg', { type: 'image/jpeg' })] },
  });
  await screen.findByRole('slider', { name: 'Ampliar foto' });
  await user.click(screen.getByRole('button', { name: 'Salvar foto' }));
  expect(await screen.findByRole('alert')).toHaveTextContent('A imagem anterior foi preservada');
  expect(screen.getByRole('dialog')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Salvar foto' })).toBeEnabled();
});

it('bloqueia fechamento enquanto remove a foto e informa falha sem ocultar o editor', async () => {
  let reject!: (error: Error) => void;
  const save = vi.fn(
    () =>
      new Promise<void>((_resolve, refuse) => {
        reject = refuse;
      }),
  );
  const user = userEvent.setup();
  render(<AccountPhoto value={current} name="Docente de Teste" onChange={save} />);
  await user.click(screen.getByRole('button', { name: 'Editar foto de perfil' }));
  await user.click(screen.getByRole('button', { name: 'Remover foto' }));
  expect(save).toHaveBeenCalledWith(undefined);
  expect(screen.getByRole('button', { name: 'Fechar' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Cancelar' })).toBeDisabled();
  reject(new Error('quota'));
  await waitFor(() => expect(screen.getByRole('button', { name: 'Cancelar' })).toBeEnabled());
  expect(screen.getByRole('dialog')).toBeInTheDocument();
});
