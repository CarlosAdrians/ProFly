export const PHOTO_MAX_BYTES = 2 * 1024 * 1024;
export function validatePhoto(file: File) {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type))
    return 'Escolha uma imagem JPG, PNG ou WebP.';
  if (file.size > PHOTO_MAX_BYTES) return 'A imagem deve ter no máximo 2 MB.';
  if (!file.size) return 'O arquivo está vazio.';
}
