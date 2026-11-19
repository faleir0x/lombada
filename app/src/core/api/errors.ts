/* Erro da API. O front nunca mostra a mensagem: quem fala é o mascote, a partir do código. */

export type ApiErrorCode = 'network' | 'bad_request' | 'unauthorized' | 'not_found' | 'conflict' | 'server';

export class ApiError extends Error {
  readonly code: ApiErrorCode;
  /** Status HTTP; null quando o pedido nem chegou (sem conexão). */
  readonly status: number | null;

  constructor(code: ApiErrorCode, message: string, status: number | null = null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
  }
}

export const isApiError = (e: unknown, code?: ApiErrorCode): e is ApiError =>
  e instanceof ApiError && (code === undefined || e.code === code);
