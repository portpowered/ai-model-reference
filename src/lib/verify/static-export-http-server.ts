import { existsSync, readFileSync, statSync } from "node:fs";
import { createServer, type Server } from "node:http";
import type { Socket } from "node:net";
import { isAbsolute, join } from "node:path";
import { normalizeGitHubPagesBasePath } from "@/lib/build/static-export";
import { exportHtmlRelativePath } from "@/lib/build/verify-phase-1-export-routes";
import { pickListenPort } from "./http-harness";

export type StaticExportHttpServerSession = {
  baseUrl: string;
  port: number;
  cleanup: () => Promise<void>;
};

export type CreateStaticExportHttpServerOptions = {
  outDir?: string;
  cwd?: string;
  basePath?: string;
  host?: string;
  port?: number;
};

function resolveOutDir(outDir: string, cwd: string): string {
  return isAbsolute(outDir) ? outDir : join(cwd, outDir);
}

function stripBasePath(pathname: string, basePath: string): string {
  const normalized = normalizeGitHubPagesBasePath(basePath);
  if (normalized === "" || !pathname.startsWith(normalized)) {
    return pathname;
  }

  const stripped = pathname.slice(normalized.length);
  return stripped === "" ? "/" : stripped;
}

function resolveStaticExportFilePath(
  outDir: string,
  pathname: string,
): string | null {
  const candidates: string[] = [];

  if (pathname === "/" || pathname === "") {
    candidates.push(join(outDir, "index.html"));
  } else {
    const trimmed = pathname.startsWith("/") ? pathname.slice(1) : pathname;
    candidates.push(
      join(outDir, trimmed),
      join(outDir, exportHtmlRelativePath(pathname)),
      join(outDir, trimmed, "index.html"),
    );
  }

  for (const candidate of candidates) {
    if (existsSync(candidate) && statSync(candidate).isFile()) {
      return candidate;
    }
  }

  return null;
}

function contentTypeForFile(filePath: string): string {
  if (filePath.endsWith(".html")) {
    return "text/html; charset=utf-8";
  }
  if (filePath.endsWith(".json")) {
    return "application/json; charset=utf-8";
  }
  if (filePath.endsWith(".js")) {
    return "text/javascript; charset=utf-8";
  }
  if (filePath.endsWith(".css")) {
    return "text/css; charset=utf-8";
  }
  return "application/octet-stream";
}

/**
 * Serves a Next.js static export `out/` directory over loopback HTTP for browser checks.
 */
export async function createStaticExportHttpServer(
  options: CreateStaticExportHttpServerOptions = {},
): Promise<StaticExportHttpServerSession> {
  const cwd = options.cwd ?? process.cwd();
  const outDir = resolveOutDir(options.outDir ?? "out", cwd);
  const basePath = normalizeGitHubPagesBasePath(options.basePath ?? "");
  const host = options.host ?? "127.0.0.1";
  const port = options.port ?? (await pickListenPort());

  const activeSockets = new Set<Socket>();
  const server = createServer((req, res) => {
    const requestUrl = new URL(req.url ?? "/", `http://${host}`);
    const pathname = stripBasePath(requestUrl.pathname, basePath);
    const filePath = resolveStaticExportFilePath(outDir, pathname);

    if (!filePath) {
      res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
      res.end("Not found");
      return;
    }

    const body = readFileSync(filePath);
    res.writeHead(200, { "Content-Type": contentTypeForFile(filePath) });
    res.end(body);
  });
  server.on("connection", (socket) => {
    activeSockets.add(socket);
    socket.on("close", () => {
      activeSockets.delete(socket);
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => resolve());
  });

  const normalizedBasePath = basePath === "" ? "" : basePath;
  const baseUrl = `http://${host}:${port}${normalizedBasePath}`;

  return {
    baseUrl,
    port,
    cleanup: async () => {
      await closeHttpServer(server, activeSockets);
    },
  };
}

function closeHttpServer(
  server: Server,
  activeSockets: ReadonlySet<Socket>,
): Promise<void> {
  return new Promise((resolve, reject) => {
    for (const socket of activeSockets) {
      socket.destroy();
    }
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }
      resolve();
    });
  });
}
