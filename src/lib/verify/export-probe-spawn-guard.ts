import {
  isPlaywrightLaunchRetryableError,
  isPlaywrightLaunchTimeoutError,
} from "./launch-playwright-browser";

function isTransientSpawnProcessError(reason: unknown): boolean {
  if (
    isPlaywrightLaunchRetryableError(reason) ||
    isPlaywrightLaunchTimeoutError(reason)
  ) {
    return true;
  }

  if (!(reason instanceof Error)) {
    return false;
  }

  return reason.message.includes("Failed to connect");
}

function spawnFailureMessage(reason: unknown): string {
  return reason instanceof Error ? reason.message : String(reason);
}

/**
 * Runs an export Playwright probe and converts transient spawn rejections that
 * escape Playwright's launch promise into a retryable failure reason string.
 */
export function isRetryableExportProbeFailure(
  reason: string | null,
): reason is string {
  if (!reason) {
    return false;
  }

  return (
    reason.includes("Failed to connect") ||
    reason.includes("browser has been closed") ||
    reason.includes("Target page, context or browser has been closed") ||
    isPlaywrightLaunchRetryableError(new Error(reason))
  );
}

export async function runExportProbeWithSpawnGuard(
  probe: () => Promise<string | null>,
): Promise<string | null> {
  let spawnError: unknown;
  const handler = (reason: unknown) => {
    if (isTransientSpawnProcessError(reason)) {
      spawnError = reason;
    }
  };

  process.on("unhandledRejection", handler);
  try {
    const result = await probe();
    if (spawnError) {
      return spawnFailureMessage(spawnError);
    }
    return result;
  } catch (error) {
    return spawnFailureMessage(error);
  } finally {
    process.off("unhandledRejection", handler);
  }
}
