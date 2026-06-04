import { createServer } from "node:net";

/** Preferred local verify listen range (avoids default dev port 3000). */
export const VERIFY_PORT_RANGE_START = 3100;
export const VERIFY_PORT_RANGE_END = 3999;

/** Default per-request HTTP deadline for Phase 1 UX verification. */
export const DEFAULT_FETCH_TIMEOUT_MS = 10_000;

const VERIFY_LISTEN_HOST = "127.0.0.1";

export function isListenPortFree(
  port: number,
  host: string = VERIFY_LISTEN_HOST,
): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

/**
 * Returns an available TCP port on 127.0.0.1, scanning 3100–3999.
 * Never assumes port 3000 is free.
 */
export async function pickListenPort(): Promise<number> {
  for (
    let port = VERIFY_PORT_RANGE_START;
    port <= VERIFY_PORT_RANGE_END;
    port += 1
  ) {
    if (await isListenPortFree(port)) {
      return port;
    }
  }
  throw new Error(
    `No free port on ${VERIFY_LISTEN_HOST} in ${VERIFY_PORT_RANGE_START}-${VERIFY_PORT_RANGE_END}`,
  );
}

export class FetchTimeoutError extends Error {
  readonly url: string;
  readonly timeoutMs: number;

  constructor(url: string, timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms: ${url}`);
    this.name = "FetchTimeoutError";
    this.url = url;
    this.timeoutMs = timeoutMs;
  }
}

export type FetchWithTimeoutInit = RequestInit & {
  timeoutMs?: number;
};

function resolveRequestUrl(input: RequestInfo | URL): string {
  if (typeof input === "string") {
    return input;
  }
  if (input instanceof URL) {
    return input.href;
  }
  return input.url;
}

/**
 * fetch with a hard Promise.race deadline (default 10s).
 * The underlying request may continue after the deadline; callers should exit the process.
 */
export async function fetchWithTimeout(
  input: RequestInfo | URL,
  init?: FetchWithTimeoutInit,
): Promise<Response> {
  const timeoutMs = init?.timeoutMs ?? DEFAULT_FETCH_TIMEOUT_MS;
  const { timeoutMs: _deadline, ...requestInit } = init ?? {};
  const url = resolveRequestUrl(input);

  let timer: ReturnType<typeof setTimeout> | undefined;
  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new FetchTimeoutError(url, timeoutMs)),
      timeoutMs,
    );
  });

  try {
    return await Promise.race([fetch(input, requestInit), deadline]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}
