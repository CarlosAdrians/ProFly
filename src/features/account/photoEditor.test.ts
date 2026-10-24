import { cropBounds, centeredCrop, openPhoto } from './photoEditor';

it('enquadra retratos e paisagens sem sair da imagem, permitindo zoom e reposicionamento', () => {
  expect(cropBounds(800, 400, centeredCrop)).toEqual({ x: 200, y: 0, side: 400 });
  expect(cropBounds(400, 800, { zoom: 2, horizontal: 100, vertical: 0 })).toEqual({
    x: 200,
    y: 0,
    side: 200,
  });
  expect(cropBounds(400, 800, { zoom: 2, horizontal: 0, vertical: 100 })).toEqual({
    x: 0,
    y: 600,
    side: 200,
  });
});
it('recusa geometria e controles fora dos limites', () => {
  for (const crop of [
    { ...centeredCrop, zoom: 0 },
    { ...centeredCrop, zoom: Infinity },
    { ...centeredCrop, horizontal: -1 },
    { ...centeredCrop, vertical: 101 },
  ])
    expect(() => cropBounds(400, 400, crop)).toThrow();
  expect(() => cropBounds(0, 400, centeredCrop)).toThrow();
});
it('rejeita arquivo vazio, formato nao permitido e excesso de tamanho antes de decodificar', async () => {
  await expect(openPhoto(new File([], 'empty.jpg', { type: 'image/jpeg' }))).rejects.toThrow(
    /vazio/,
  );
  await expect(
    openPhoto(new File(['<svg/>'], 'photo.svg', { type: 'image/svg+xml' })),
  ).rejects.toThrow(/JPG, PNG ou WebP/);
  await expect(
    openPhoto(new File([new Uint8Array(2 * 1024 * 1024 + 1)], 'large.png', { type: 'image/png' })),
  ).rejects.toThrow(/2 MB/);
});
