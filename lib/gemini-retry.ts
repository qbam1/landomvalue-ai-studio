export function errorStatus(error: unknown): number {
  if (!error || typeof error !== "object") return 0;
  const value = error as { status?: unknown; code?: unknown };
  const status = Number(value.status ?? value.code);
  return Number.isFinite(status) ? status : 0;
}

export async function withRetry<T>(
  operation: () => Promise<T>,
  onRetry: (status: number, attempt: number) => void,
  sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await operation();
    } catch (error: unknown) {
      const status = errorStatus(error);
      if (attempt >= 2 || ![429, 500, 502, 503, 504].includes(status)) throw error;
      onRetry(status, attempt + 1);
      // Stagger retries from students sending questions at the same instant.
      await sleep(1000 * 2 ** attempt + Math.floor(Math.random() * 500));
    }
  }
}
