import { existsSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import {
  DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
  waitForServerReady,
} from "./server-lifecycle";
import {
  createStaticExportHttpServer,
  type StaticExportHttpServerSession,
} from "./static-export-http-server";

export const DEFAULT_EXPORT_OUT_DIR = "out";

export type StaticExportServerLifecycleSuccess = {
  status: "pass";
  session: StaticExportHttpServerSession;
  baseUrl: string;
};

export type StaticExportServerLifecycleFailure = {
  status: "fail";
  reason: string;
};

export type StaticExportServerLifecycleOutcome =
  | StaticExportServerLifecycleSuccess
  | StaticExportServerLifecycleFailure;

export type RunStaticExportServerLifecycleOptions = {
  outDir?: string;
  cwd?: string;
  basePath?: string;
  host?: string;
  port?: number;
  startupTimeoutMs?: number;
  pollPath?: string;
};

function resolveOutDirAbsolute(outDir: string, cwd: string): string {
  return isAbsolute(outDir) ? outDir : join(cwd, outDir);
}

/**
 * Starts a loopback static file server for `out/`, waits until the home route
 * returns HTTP 200, and returns a session the caller must tear down.
 */
export async function runStaticExportServerLifecycle(
  options: RunStaticExportServerLifecycleOptions = {},
): Promise<StaticExportServerLifecycleOutcome> {
  const cwd = options.cwd ?? process.cwd();
  const outDir = options.outDir ?? DEFAULT_EXPORT_OUT_DIR;
  const absoluteOutDir = resolveOutDirAbsolute(outDir, cwd);

  if (!existsSync(absoluteOutDir)) {
    return {
      status: "fail",
      reason: `Missing export directory at ${outDir} — run \`make internal-build-export\` first.`,
    };
  }

  let session: StaticExportHttpServerSession | undefined;

  try {
    session = await createStaticExportHttpServer({
      outDir,
      cwd,
      basePath: options.basePath,
      host: options.host ?? "127.0.0.1",
      port: options.port,
    });

    await waitForServerReady(session.baseUrl, {
      timeoutMs: options.startupTimeoutMs ?? DEFAULT_SERVER_STARTUP_TIMEOUT_MS,
      pollPath: options.pollPath ?? "/",
      port: session.port,
    });

    return {
      status: "pass",
      session,
      baseUrl: session.baseUrl,
    };
  } catch (error) {
    if (session) {
      await session.cleanup().catch(() => {});
    }

    const reason =
      error instanceof Error
        ? error.message
        : "Static export file server lifecycle failed before readiness.";

    return {
      status: "fail",
      reason,
    };
  }
}
