import { request as httpRequest } from "node:http";
import { createServer, type Server } from "node:net";

/** Preferred local verify listen range (avoids default dev port 3000). */
export const VERIFY_PORT_RANGE_START = 3100;
export const VERIFY_PORT_RANGE_END = 3999;

export type ListenPortReservation = {
  port: number;
  release: () => Promise<void>;
};

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

function closeServer(server: Server): Promise<void> {
  return new Promise((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}

function tryReserveListenPort(
  port: number,
): Promise<ListenPortReservation | null> {
  const server = createServer();

  return new Promise((resolve, reject) => {
    server.once("error", (error: NodeJS.ErrnoException) => {
      if (error.code === "EADDRINUSE" || error.code === "EACCES") {
        resolve(null);
        return;
      }
      reject(error);
    });

    server.listen(port, VERIFY_LISTEN_HOST, () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        void closeServer(server).finally(() => resolve(null));
        return;
      }

      resolve({
        port: address.port,
        release: () => closeServer(server),
      });
    });
  });
}

/**
 * Atomically reserves a TCP port on 127.0.0.1 in 3100–3999 by binding it.
 * Callers must release the reservation before another process can reuse the port.
 */
export async function reserveListenPort(): Promise<ListenPortReservation> {
  for (
    let port = VERIFY_PORT_RANGE_START;
    port <= VERIFY_PORT_RANGE_END;
    port += 1
  ) {
    const reservation = await tryReserveListenPort(port);
    if (reservation) {
      return reservation;
    }
  }
  throw new Error(
    `No free port on ${VERIFY_LISTEN_HOST} in ${VERIFY_PORT_RANGE_START}-${VERIFY_PORT_RANGE_END}`,
  );
}

/**
 * Returns an available TCP port on 127.0.0.1, scanning 3100–3999.
 * Never assumes port 3000 is free.
 */
export async function pickListenPort(): Promise<number> {
  const reservation = await reserveListenPort();
  const port = reservation.port;
  await reservation.release();
  return port;
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
/**
 * Node http GET with a hard deadline. Avoids browser fetch/CORS in test runtimes.
 */
export type HttpGetTextResult = {
  status: number;
  body: string;
};

export async function httpGetStatus(
  url: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<number> {
  const { status } = await httpGetText(url, timeoutMs);
  return status;
}

/**
 * Node http GET returning status and response body. Avoids browser fetch/CORS in test runtimes.
 */
export async function httpGetText(
  url: string,
  timeoutMs: number = DEFAULT_FETCH_TIMEOUT_MS,
): Promise<HttpGetTextResult> {
  let timer: ReturnType<typeof setTimeout> | undefined;

  const deadline = new Promise<never>((_, reject) => {
    timer = setTimeout(
      () => reject(new FetchTimeoutError(url, timeoutMs)),
      timeoutMs,
    );
  });

  const requestPromise = new Promise<HttpGetTextResult>((resolve, reject) => {
    const req = httpRequest(url, { method: "GET" }, (res) => {
      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        resolve({
          status: res.statusCode ?? 0,
          body: Buffer.concat(chunks).toString("utf8"),
        });
      });
      res.on("error", reject);
    });
    req.once("error", reject);
    req.end();
  });

  try {
    return await Promise.race([requestPromise, deadline]);
  } finally {
    if (timer !== undefined) {
      clearTimeout(timer);
    }
  }
}

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
