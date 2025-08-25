interface TimeoutError extends Error {
  name: 'TimeoutError';
  code: 'ETIMEDOUT';
  details: Record<string, unknown>;
}

export function abortAfter<T>(
  ms: number,
  p: Promise<T>,
  info?: {
    tool?: 'axe-core' | 'equal-access';
    phase?: string;
    extra?: Record<string, unknown>;
  }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err = new Error(`Timeout after ${ms}ms`) as TimeoutError;
      err.name = 'TimeoutError';
      err.code = 'ETIMEDOUT';
      err.details = {
        durationMs: ms,
        ...(info ?? {}),
        ...(info?.extra ? JSON.parse(JSON.stringify(info.extra)) : {}),
      };
      reject(err);
    }, ms);

    p.then(
      v => {
        clearTimeout(timer);
        resolve(v);
      },
      e => {
        clearTimeout(timer);
        reject(e instanceof Error ? e : new Error(String(e)));
      }
    );
  });
}
