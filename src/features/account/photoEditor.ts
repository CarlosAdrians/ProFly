import { validatePhoto } from '../../components/ui/PhotoField/validation';

export interface CropSettings {
  zoom: number;
  horizontal: number;
  vertical: number;
}
export const centeredCrop: CropSettings = { zoom: 1, horizontal: 50, vertical: 50 };
export function cropBounds(width: number, height: number, settings: CropSettings) {
  if (
    ![width, height, settings.zoom, settings.horizontal, settings.vertical].every(
      Number.isFinite,
    ) ||
    width <= 0 ||
    height <= 0 ||
    settings.zoom < 1 ||
    settings.zoom > 3 ||
    settings.horizontal < 0 ||
    settings.horizontal > 100 ||
    settings.vertical < 0 ||
    settings.vertical > 100
  )
    throw new Error('Enquadramento inválido.');
  const side = Math.min(width, height) / settings.zoom;
  return {
    x: ((width - side) * settings.horizontal) / 100,
    y: ((height - side) * settings.vertical) / 100,
    side,
  };
}
export function drawPhoto(
  canvas: HTMLCanvasElement,
  image: HTMLImageElement,
  settings: CropSettings,
) {
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Não foi possível preparar a foto neste navegador.');
  const crop = cropBounds(image.naturalWidth, image.naturalHeight, settings);
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, crop.x, crop.y, crop.side, crop.side, 0, 0, canvas.width, canvas.height);
}
export function encodePhoto(image: HTMLImageElement, settings: CropSettings) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 256;
  drawPhoto(canvas, image, settings);
  const data = canvas.toDataURL('image/jpeg', 0.9);
  if (!data.startsWith('data:image/jpeg;base64,'))
    throw new Error('Não foi possível preparar a foto.');
  return data;
}
async function decode(source: string) {
  const image = new Image();
  image.src = source;
  await image.decode();
  if (
    !image.naturalWidth ||
    !image.naturalHeight ||
    image.naturalWidth * image.naturalHeight > 40000000
  )
    throw new Error('Escolha uma imagem com até 40 megapixels.');
  return image;
}
export async function openPhoto(file: File) {
  const invalid = validatePhoto(file);
  if (invalid) throw new Error(invalid);
  const url = URL.createObjectURL(file);
  try {
    return { image: await decode(url), release: () => URL.revokeObjectURL(url) };
  } catch (failure) {
    URL.revokeObjectURL(url);
    throw failure;
  }
}
export async function reopenPhoto(source: string) {
  if (!/^data:image\/(jpeg|png|webp);base64,/.test(source))
    throw new Error('Formato de foto não suportado.');
  return { image: await decode(source), release: () => {} };
}
