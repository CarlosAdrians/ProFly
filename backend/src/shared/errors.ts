import { z } from 'zod';

export class AppError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly fieldErrors?: Record<string, string[]>,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export function parse<T extends z.ZodType>(schema: T, value: unknown): z.infer<T> {
  const result = schema.safeParse(value);
  if (!result.success) {
    const fields: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.join('.') || '_form';
      (fields[key] ??= []).push(
        issue.code === 'unrecognized_keys'
          ? 'Campo nao permitido.'
          : issue.code === 'invalid_type'
            ? 'Informe um valor do tipo esperado.'
            : issue.code === 'too_small'
              ? 'Valor ausente ou abaixo do minimo permitido.'
              : issue.code === 'too_big'
                ? 'Valor acima do limite permitido.'
                : issue.code === 'invalid_format'
                  ? 'Confira o formato informado.'
                  : issue.message,
      );
    }
    throw new AppError(422, 'VALIDATION_ERROR', 'Confira os campos informados.', fields);
  }
  return result.data;
}

export function missing(): never {
  throw new AppError(404, 'NOT_FOUND', 'Recurso indisponivel.');
}
export function conflict(code = 'CONFLICT', message = 'Os dados mudaram ou ja existem.'): never {
  throw new AppError(409, code, message);
}

export function errorResponse(error: unknown, requestId: string) {
  let failure: AppError;
  if (error instanceof AppError) failure = error;
  else {
    const detail = (typeof error === 'object' && error !== null ? error : {}) as {
      code?: number | string;
      statusCode?: number;
      validation?: unknown;
      name?: string;
    };
    if (detail.code === 11000) failure = new AppError(409, 'DUPLICATE', 'Registro ja existente.');
    else if (
      detail.code === 'FST_ERR_CTP_INVALID_JSON_BODY' ||
      detail.code === 'FST_ERR_CTP_EMPTY_JSON_BODY'
    )
      failure = new AppError(400, 'INVALID_JSON', 'JSON invalido.');
    else if (detail.statusCode === 413)
      failure = new AppError(413, 'PAYLOAD_TOO_LARGE', 'Arquivo ou requisicao acima do limite.');
    else if (detail.statusCode === 415)
      failure = new AppError(415, 'UNSUPPORTED_MEDIA_TYPE', 'Formato nao permitido.');
    else if (detail.statusCode === 429)
      failure = new AppError(429, 'RATE_LIMITED', 'Muitas tentativas. Tente novamente mais tarde.');
    else if (detail.validation)
      failure = new AppError(422, 'VALIDATION_ERROR', 'Requisicao invalida.');
    else if (detail.name?.startsWith('Mongo'))
      failure = new AppError(503, 'DEPENDENCY_UNAVAILABLE', 'Servico de dados indisponivel.');
    else failure = new AppError(500, 'INTERNAL_ERROR', 'Nao foi possivel concluir a operacao.');
  }
  return {
    status: failure.status,
    body: {
      error: {
        code: failure.code,
        message: failure.message,
        ...(failure.fieldErrors ? { fieldErrors: failure.fieldErrors } : {}),
        requestId,
      },
    },
  };
}
