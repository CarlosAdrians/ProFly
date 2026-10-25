import sharp from 'sharp';
import { AppError } from '../shared/errors.js';
export async function validateImage(bytes: Buffer, type: string, maxBytes: number) {
  if (bytes.length > maxBytes)
    throw new AppError(413, 'FILE_TOO_LARGE', 'Arquivo acima do limite.');
  const formats: Record<string, string> = {
    'image/jpeg': 'jpeg',
    'image/png': 'png',
    'image/webp': 'webp',
  };
  if (!formats[type]) throw new AppError(415, 'UNSUPPORTED_FILE', 'Use JPG, PNG ou WebP.');
  try {
    const image = sharp(bytes, { limitInputPixels: 16000000, failOn: 'warning', pages: 1 }).timeout(
      { seconds: 5 },
    );
    const meta = await image.metadata();
    if (meta.format !== formats[type] || (meta.pages ?? 1) > 1 || !meta.width || !meta.height)
      throw new Error('Invalid image');
    // Decode the complete content before accepting, preserving the original document bytes.
    await image.stats();
  } catch {
    throw new AppError(
      415,
      'INVALID_IMAGE',
      'Imagem invalida, corrompida ou acima do limite de 16 megapixels.',
    );
  }
  return bytes;
}
