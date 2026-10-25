export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: Record<string, string[]> = {},
  ) {
    super(message);
  }
}
let csrf = '';
export function setCsrf(value: string) {
  csrf = value;
}
export async function api<T>(
  path: string,
  options: { method?: string; body?: unknown; signal?: AbortSignal } = {},
): Promise<T> {
  const method = options.method ?? 'GET';
  const headers: Record<string, string> = { Accept: 'application/json' };
  const multipart = options.body instanceof FormData;
  if (options.body !== undefined && !multipart) headers['Content-Type'] = 'application/json';
  if (method !== 'GET' && csrf) headers['x-csrf-token'] = csrf;
  let response: Response;
  try {
    response = await fetch(`/api/v1${path}`, {
      method,
      headers,
      credentials: 'include',
      signal: options.signal,
      body:
        options.body === undefined
          ? undefined
          : multipart
            ? (options.body as FormData)
            : JSON.stringify(options.body),
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(
      0,
      'NETWORK_ERROR',
      'Não foi possível acessar o servidor. Seus campos foram preservados.',
    );
  }
  if (!response.ok) {
    let failure: {
      error?: { code?: string; message?: string; fieldErrors?: Record<string, string[]> };
    } = {};
    try {
      failure = await response.json();
    } catch {
      /* Reverse proxy/network errors do not expose response bodies. */
    }
    if (response.status === 401 && failure.error?.code === 'UNAUTHENTICATED')
      window.dispatchEvent(new Event('profly:session-expired'));
    throw new ApiError(
      response.status,
      failure.error?.code ?? 'HTTP_ERROR',
      failure.error?.message ?? 'Não foi possível concluir. Tente novamente.',
      failure.error?.fieldErrors,
    );
  }
  if (response.status === 204) return undefined as T;
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiError(502, 'INVALID_RESPONSE', 'O servidor retornou uma resposta inválida.');
  }
}
export async function download(path: string) {
  const response = await fetch(`/api/v1${path}`, { credentials: 'include' });
  if (!response.ok)
    throw new ApiError(response.status, 'DOWNLOAD_FAILED', 'Não foi possível baixar o documento.');
  const url = URL.createObjectURL(await response.blob());
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = 'atestado';
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
