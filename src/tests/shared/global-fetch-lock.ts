let globalFetchLockTail: Promise<void> = Promise.resolve();

export async function lockGlobalFetch(): Promise<() => void> {
  const previous = globalFetchLockTail;
  let releaseCurrent!: () => void;
  globalFetchLockTail = new Promise<void>((resolve) => {
    releaseCurrent = resolve;
  });
  await previous;
  return () => {
    releaseCurrent();
  };
}

export async function withGlobalFetchOverride<T>(
  fetchImpl: typeof fetch,
  run: () => Promise<T> | T,
): Promise<T> {
  const release = await lockGlobalFetch();
  const originalFetch = globalThis.fetch;
  globalThis.fetch = fetchImpl;

  try {
    return await run();
  } finally {
    globalThis.fetch = originalFetch;
    release();
  }
}
