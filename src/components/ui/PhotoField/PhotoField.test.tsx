import { fireEvent, render, screen } from '@testing-library/react';
import { PhotoField } from './PhotoField';
describe('foto opcional', () => {
  it('recusa formato e tamanho invalidos, preservando a foto atual', async () => {
    const change = vi.fn();
    render(<PhotoField value="data:image/jpeg;base64,AAAA" onChange={change} />);
    const input = screen.getByLabelText('Selecionar foto de perfil');
    fireEvent.change(input, {
      target: { files: [new File(['<svg/>'], 'image.svg', { type: 'image/svg+xml' })] },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('JPG, PNG ou WebP');
    fireEvent.change(input, {
      target: {
        files: [
          new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' }),
        ],
      },
    });
    expect(await screen.findByRole('alert')).toHaveTextContent('2 MB');
    expect(change).not.toHaveBeenCalled();
  });
});
