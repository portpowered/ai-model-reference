import { availableParallelism } from "node:os";

export const defaultLocalWebsiteTestWorkers = 4;
export const defaultCiWebsiteTestWorkers = 1;

export function resolveWebsiteTestShardWorkers(
  rawWorkers: string | undefined,
  options?: {
    ci?: boolean;
    parallelism?: number;
  },
): number {
  const ci = options?.ci ?? process.env.CI === "true";
  const parallelism = options?.parallelism ?? availableParallelism();
  const defaultWorkers = ci
    ? defaultCiWebsiteTestWorkers
    : defaultLocalWebsiteTestWorkers;
  const cappedDefault = Math.max(1, Math.min(defaultWorkers, parallelism - 1));
  const raw = rawWorkers?.trim();

  if (!raw) {
    return cappedDefault;
  }

  const parsed = Number.parseInt(raw, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return cappedDefault;
  }

  return parsed;
}
