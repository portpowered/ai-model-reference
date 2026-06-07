import { CANONICAL_GITHUB_PAGES_BASE_PATH } from "./phase-1-github-pages-deploy-workflow";
import {
  normalizeVerifyBaseUrl,
  resolveVerifyBaseUrlFromEnv,
  VERIFY_BASE_URL_ENV,
} from "./server-lifecycle";
import type { StaticExportHttpServerSession } from "./static-export-http-server";
import {
  DEFAULT_EXPORT_OUT_DIR,
  runStaticExportServerLifecycle,
  type StaticExportServerLifecycleOutcome,
} from "./static-export-server-lifecycle";

export const DEPLOY_PATH_VERIFY_BASE_URL_UNCERTAIN_REASON =
  "VERIFY_BASE_URL was set; canonical deploy-path validation requires default static export spawn with VERIFY_BASE_URL unset.";

export type DeployStaticHarnessSession = {
  baseUrl: string;
  cleanup: () => Promise<void>;
};

export type DeployStaticHarnessPass = {
  status: "pass";
  baseUrl: string;
  session: DeployStaticHarnessSession;
  usedExternalVerifyBaseUrl: false;
};

export type DeployStaticHarnessUncertain = {
  status: "uncertain";
  baseUrl: string;
  session: DeployStaticHarnessSession;
  reason: string;
  usedExternalVerifyBaseUrl: true;
};

export type DeployStaticHarnessFail = {
  status: "fail";
  reason: string;
};

export type DeployStaticHarnessOutcome =
  | DeployStaticHarnessPass
  | DeployStaticHarnessUncertain
  | DeployStaticHarnessFail;

export type AcquireStaticExportVerifySessionOptions = {
  cwd?: string;
  outDir?: string;
  basePath?: string;
  host?: string;
  port?: number;
  startupTimeoutMs?: number;
  env?: Record<string, string | undefined>;
  verifyBaseUrl?: string;
};

/**
 * Canonical GitHub Pages project-site base path for deploy-path static harness
 * checks (matches `make build-export` with deploy convergence env).
 */
export function resolveDeployStaticHarnessBasePath(): string {
  return `/${CANONICAL_GITHUB_PAGES_BASE_PATH}`;
}

/**
 * Child-process environment for canonical deploy convergence: unsets
 * `VERIFY_BASE_URL` so the default static export spawn path is used.
 */
export function buildDeployConvergenceVerifyEnv(
  env: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv {
  const canonical = { ...env };
  delete canonical[VERIFY_BASE_URL_ENV];
  return canonical;
}

function toHarnessSession(
  session: StaticExportHttpServerSession,
): DeployStaticHarnessSession {
  return {
    baseUrl: session.baseUrl,
    cleanup: () => session.cleanup(),
  };
}

function externalVerifyBaseUrlOutcome(
  baseUrl: string,
): DeployStaticHarnessUncertain {
  const normalized = normalizeVerifyBaseUrl(baseUrl);
  return {
    status: "uncertain",
    baseUrl: normalized,
    session: {
      baseUrl: normalized,
      cleanup: async () => {},
    },
    reason: DEPLOY_PATH_VERIFY_BASE_URL_UNCERTAIN_REASON,
    usedExternalVerifyBaseUrl: true,
  };
}

function lifecycleToHarnessOutcome(
  lifecycle: StaticExportServerLifecycleOutcome,
): DeployStaticHarnessPass | DeployStaticHarnessFail {
  if (lifecycle.status === "fail") {
    return {
      status: "fail",
      reason: lifecycle.reason,
    };
  }

  return {
    status: "pass",
    baseUrl: lifecycle.baseUrl,
    session: toHarnessSession(lifecycle.session),
    usedExternalVerifyBaseUrl: false,
  };
}

/**
 * Starts a loopback static file server for `out/` with the canonical GitHub
 * Pages base path, or returns an uncertain outcome when `VERIFY_BASE_URL` is set.
 * Callers must invoke `session.cleanup()` when a session is returned.
 */
export async function acquireStaticExportVerifySession(
  options: AcquireStaticExportVerifySessionOptions = {},
): Promise<DeployStaticHarnessOutcome> {
  const env = options.env ?? process.env;
  const configuredBaseUrl =
    options.verifyBaseUrl ?? resolveVerifyBaseUrlFromEnv(env);

  if (configuredBaseUrl) {
    return externalVerifyBaseUrlOutcome(configuredBaseUrl);
  }

  const lifecycle = await runStaticExportServerLifecycle({
    cwd: options.cwd,
    outDir: options.outDir ?? DEFAULT_EXPORT_OUT_DIR,
    basePath: options.basePath ?? resolveDeployStaticHarnessBasePath(),
    host: options.host,
    port: options.port,
    startupTimeoutMs: options.startupTimeoutMs,
  });

  return lifecycleToHarnessOutcome(lifecycle);
}
