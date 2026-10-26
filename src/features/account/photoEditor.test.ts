import { cropBounds, centeredCrop, openPhoto, reopenPhoto } from './photoEditor';

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

it('reabre somente a rota privada da propria foto e trata recusa sem buscar fontes externas', async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response('', { status: 403 }));
  vi.stubGlobal('fetch', fetcher);
  try {
    await expect(reopenPhoto('https://externo.test/perfil.jpg')).rejects.toThrow(/Formato/);
    expect(fetcher).not.toHaveBeenCalled();
    await expect(reopenPhoto('/api/v1/me/photo?v=2')).rejects.toThrow(
      'Não foi possível carregar a foto atual.',
    );
    expect(fetcher).toHaveBeenCalledWith('/api/v1/me/photo?v=2', { credentials: 'include' });
  } finally {
    vi.unstubAllGlobals();
  }
});
