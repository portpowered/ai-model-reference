import { closeSync, constants, openSync, statSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VERIFY_LISTEN_PORT_LOCK_PATH = join(
  tmpdir(),
  "model-atlas-verify-listen-port.lock",
);
const LOCK_POLL_MS = 50;
const STALE_VERIFY_LISTEN_PORT_LOCK_MAX_AGE_MS = 15_000;

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

function removeStaleVerifyListenPortLockIfNeeded(): void {
  try {
    const { mtimeMs } = statSync(VERIFY_LISTEN_PORT_LOCK_PATH);
    if (Date.now() - mtimeMs > STALE_VERIFY_LISTEN_PORT_LOCK_MAX_AGE_MS) {
      unlinkSync(VERIFY_LISTEN_PORT_LOCK_PATH);
    }
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

function tryAcquireVerifyListenPortLock(): (() => void) | null {
  try {
    const fd = openSync(
      VERIFY_LISTEN_PORT_LOCK_PATH,
      constants.O_CREAT | constants.O_EXCL | constants.O_WRONLY,
      0o600,
    );
    closeSync(fd);
    return () => {
      try {
        unlinkSync(VERIFY_LISTEN_PORT_LOCK_PATH);
      } catch {
        // ignore release races
      }
    };
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "EEXIST"
    ) {
      removeStaleVerifyListenPortLockIfNeeded();
      return null;
    }
    throw error;
  }
}

async function acquireVerifyListenPortLock(): Promise<() => void> {
  while (true) {
    const release = tryAcquireVerifyListenPortLock();
    if (release) {
      return release;
    }
    await sleep(LOCK_POLL_MS);
  }
}

/** Test-only helper to clear a stale lock after timed-out subprocess tests. */
export function removeVerifyListenPortLockForTests(): void {
  try {
    unlinkSync(VERIFY_LISTEN_PORT_LOCK_PATH);
  } catch (error) {
    if (
      error &&
      typeof error === "object" &&
      "code" in error &&
      error.code === "ENOENT"
    ) {
      return;
    }
    throw error;
  }
}

/**
 * Serializes default-path verify server startup so parallel `bun test` workers
 * do not race on `pickListenPort` scan-then-bind and collide on 127.0.0.1 ports.
 */
export async function withVerifyListenPortLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  const release = await acquireVerifyListenPortLock();
  try {
    return await operation();
  } finally {
    release();
  }
}
