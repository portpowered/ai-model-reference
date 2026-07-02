export function isCiEnvironment(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.CI === "true" || env.GITHUB_ACTIONS === "true";
}

type ResolveWebsiteTestParallelWorkersOptions = {
  defaultWorkers: number;
  env?: NodeJS.ProcessEnv;
};

export function resolveWebsiteTestParallelWorkers({
  defaultWorkers,
  env = process.env,
}: ResolveWebsiteTestParallelWorkersOptions): number {
  const raw = env.WEBSITE_TEST_PARALLEL_WORKERS?.trim();
  if (raw) {
    const parsed = Number.parseInt(raw, 10);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  if (isCiEnvironment(env)) {
    return 1;
  }

  return defaultWorkers;
}
