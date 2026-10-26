import { Worker } from 'node:worker_threads';
import { AppError } from '../shared/errors.js';
import { validateImage } from '../scheduling/media.js';

let activeParsers = 0;
export const DOCUMENT_MAX_BYTES = 5 * 1024 * 1024;
export async function validateDocument(bytes: Buffer, type: string, maxBytes: number) {
  maxBytes = Math.min(maxBytes, DOCUMENT_MAX_BYTES);
  if (bytes.length > maxBytes)
    throw new AppError(413, 'FILE_TOO_LARGE', 'Arquivo acima do limite.');
  if (type !== 'application/pdf') return validateImage(bytes, type, maxBytes);
  const invalid = () =>
    new AppError(
      415,
      'INVALID_PDF',
      'Use PDF valido de ate 50 paginas, sem senha, formularios, scripts, links ativos ou arquivos incorporados.',
    );
  if (
    !/^%PDF-(?:1\.[0-7]|2\.0)[\r\n]/.test(bytes.subarray(0, 10).toString('latin1')) ||
    !bytes
      .subarray(-2048)
      .toString('latin1')
      .replaceAll(String.fromCharCode(0), '')
      .trimEnd()
      .endsWith('%%EOF')
  )
    throw invalid();
  if (activeParsers >= 2)
    throw new AppError(429, 'FILE_VALIDATION_BUSY', 'Aguarde e tente enviar novamente.');
  activeParsers += 1;
  let worker: Worker | undefined;
  try {
    worker = new Worker(
      new URL(
        import.meta.url.endsWith('.ts') ? './pdf-worker.ts' : './pdf-worker.js',
        import.meta.url,
      ),
      {
        workerData: Uint8Array.from(bytes),
        execArgv: [],
        resourceLimits: { maxOldGenerationSizeMb: 64, stackSizeMb: 4 },
        stdout: true,
        stderr: true,
      },
    );
    // Parser diagnostics must not put private document contents in application logs.
    worker.stdout.resume();
    worker.stderr.resume();
    const valid = await new Promise<boolean>((resolve) => {
      const timeout = setTimeout(() => resolve(false), 5000);
      const finish = (result: boolean) => {
        clearTimeout(timeout);
        resolve(result);
      };
      worker!.once('message', (result: unknown) => finish(result === true));
      worker!.once('error', () => finish(false));
      worker!.once('exit', () => finish(false));
    });
    if (!valid) throw invalid();
    return bytes;
  } finally {
    await worker?.terminate();
    activeParsers -= 1;
  }
}

export function documentExtension(type: string) {
  return (
    { 'application/pdf': 'pdf', 'image/png': 'png', 'image/webp': 'webp', 'image/jpeg': 'jpg' }[
      type
    ] ?? 'bin'
  );
}
