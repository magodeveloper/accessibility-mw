export interface ApiResponse<T = unknown> {
  ok: boolean;
  data?: T;
  error?: string;
  code?: string;
  details?: Record<string, unknown>;
  requestId?: string;
}

export function success<T>(data: T, requestId?: string): ApiResponse<T> {
  return { ok: true, data, requestId };
}

export function error(
  error: string,
  code?: string,
  details?: Record<string, unknown>,
  requestId?: string
): ApiResponse<never> {
  return { ok: false, error, code, details, requestId };
}
