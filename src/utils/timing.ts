export function abortAfter<T>(
  ms: number,
  p: Promise<T>,
  info?: { tool?: 'axe-core' | 'equal-access'; phase?: string; extra?: Record<string, any> }
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      const err: any = new Error(`Timeout after ${ms}ms`);
      err.name = 'TimeoutError';
      err.code = 'ETIMEDOUT';
      err.details = {
        durationMs: ms,
        ...(info ?? {}),
        ...(info?.extra ? JSON.parse(JSON.stringify(info.extra)) : {})
      };
      reject(err instanceof Error ? err : new Error(String(err)));
    }, ms);

    p.then(
      (v) => { clearTimeout(timer); resolve(v); },
      (e) => { clearTimeout(timer); reject(e instanceof Error ? e : new Error(String(e))); }
    );
  });
}