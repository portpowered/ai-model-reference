import { afterEach, describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import {
  DEFAULT_FETCH_TIMEOUT_MS,
  FetchTimeoutError,
  fetchWithTimeout,
  isListenPortFree,
  pickListenPort,
  reserveListenPort,
  VERIFY_PORT_RANGE_END,
  VERIFY_PORT_RANGE_START,
} from "./http-harness";

describe("pickListenPort", () => {
  const heldReservations: Array<{ release: () => Promise<void> }> = [];

  afterEach(async () => {
    for (const reservation of heldReservations.splice(0)) {
      await reservation.release();
    }
  });

  test("returns a port in the verify range, not 3000", async () => {
    const port = await pickListenPort();
    expect(port).toBeGreaterThanOrEqual(VERIFY_PORT_RANGE_START);
    expect(port).toBeLessThanOrEqual(VERIFY_PORT_RANGE_END);
    expect(port).not.toBe(3000);
    expect(await isListenPortFree(port)).toBe(true);
  });

  test("returns a distinct port when the first pick is held open", async () => {
    const reservation = await reserveListenPort();
    heldReservations.push(reservation);

    const port2 = await pickListenPort();
    expect(port2).not.toBe(reservation.port);
    expect(await isListenPortFree(port2)).toBe(true);
  });
});

describe("fetchWithTimeout", () => {
  test("uses a default deadline of at most 10 seconds", () => {
    expect(DEFAULT_FETCH_TIMEOUT_MS).toBeLessThanOrEqual(10_000);
  });

  test("rejects when the server does not respond before the deadline", async () => {
    const httpServer = createHttpServer(() => {
      // Intentionally never call res.end() — client should hit the hard deadline.
    });

    const port = await new Promise<number>((resolve, reject) => {
      httpServer.once("error", reject);
      httpServer.listen(0, "127.0.0.1", () => {
        const address = httpServer.address();
        if (!address || typeof address === "string") {
          reject(new Error("Expected bound TCP port"));
          return;
        }
        resolve(address.port);
      });
    });

    try {
      await expect(
        fetchWithTimeout(`http://127.0.0.1:${port}/`, { timeoutMs: 200 }),
      ).rejects.toThrow(FetchTimeoutError);
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("rejects for an unreachable host with a short deadline", async () => {
    const port = await pickListenPort();
    try {
      await fetchWithTimeout(`http://127.0.0.1:${port}/`, { timeoutMs: 500 });
      expect.unreachable("fetch should reject");
    } catch (error) {
      expect(error).toBeDefined();
    }
  });
});
