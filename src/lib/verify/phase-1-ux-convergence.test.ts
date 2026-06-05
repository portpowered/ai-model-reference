import { describe, expect, test } from "bun:test";
import { createServer as createHttpServer } from "node:http";
import { PLACEHOLDER_SIDEBAR_DESCRIPTION } from "@/lib/navigation/docs-sidebar-contract";
import { DOCS_SHELL_CONVERGENCE_REASONS } from "./docs-shell-convergence";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";
import { assertPhase1UxConvergence } from "./phase-1-ux-convergence";
import { PHASE_1_UX_PASSING_STUB_HTML } from "./phase-1-ux-stub-fixtures";

const SPLIT_SHELL_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <aside aria-label="Docs sidebar">
    <p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>
  </aside>
  <article>Index content without Fumadocs regions</article>
`;

const PRE_REPAIR_HOME_HTML = PHASE_1_UX_PASSING_STUB_HTML["/"]?.replace(
  "<article>",
  `<article><section id="search"><h2>${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2><input data-search="" /></section>`,
);

function listenOnEphemeralPort(
  httpServer: ReturnType<typeof createHttpServer>,
): Promise<number> {
  return new Promise((resolve, reject) => {
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
}

function createConvergenceStubServer(
  htmlByPath: Record<string, string>,
): ReturnType<typeof createHttpServer> {
  return createHttpServer((req, res) => {
    const path = req.url?.split("?")[0] ?? "/";
    const body = htmlByPath[path] ?? "<html>not found</html>";
    res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
    res.end(body);
  });
}

describe("assertPhase1UxConvergence", () => {
  test("passes when docs shell, home search entry, and reader convergence succeed", async () => {
    const httpServer = createConvergenceStubServer(
      PHASE_1_UX_PASSING_STUB_HTML,
    );
    const port = await listenOnEphemeralPort(httpServer);

    try {
      await expect(
        assertPhase1UxConvergence(`http://127.0.0.1:${port}`, {
          docsShellOptions: { timeoutMs: 2_000 },
          homeSearchEntryOptions: { timeoutMs: 2_000 },
          readerConvergenceOptions: {
            readerRouteOptions: { timeoutMs: 2_000 },
            tagsNavigationOptions: { timeoutMs: 2_000 },
          },
        }),
      ).resolves.toBeUndefined();
    } finally {
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails docs shell convergence before home and reader checks", async () => {
    const httpServer = createConvergenceStubServer({
      ...PHASE_1_UX_PASSING_STUB_HTML,
      "/docs/architecture": `<html>${SPLIT_SHELL_HTML}</html>`,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;
    const stderrLines: string[] = [];
    const originalStderr = console.error;

    console.error = (...args: unknown[]) => {
      stderrLines.push(args.map(String).join(" "));
    };

    try {
      await expect(
        assertPhase1UxConvergence(baseUrl, {
          docsShellOptions: { timeoutMs: 2_000 },
          homeSearchEntryOptions: { timeoutMs: 2_000 },
          readerConvergenceOptions: {
            readerRouteOptions: { timeoutMs: 2_000 },
            tagsNavigationOptions: { timeoutMs: 2_000 },
          },
        }),
      ).rejects.toThrow("Phase 1 docs shell convergence verification failed");

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/docs/architecture`);
      expect(stderr).toContain(DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar);
      expect(stderr).not.toContain(REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE);
      expect(stderr).not.toContain(`${baseUrl}/tags`);
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });

  test("fails home search entry after docs shell and before reader checks", async () => {
    if (!PRE_REPAIR_HOME_HTML) {
      throw new Error("expected pre-repair home fixture");
    }

    const httpServer = createConvergenceStubServer({
      ...PHASE_1_UX_PASSING_STUB_HTML,
      "/": PRE_REPAIR_HOME_HTML,
    });
    const port = await listenOnEphemeralPort(httpServer);
    const baseUrl = `http://127.0.0.1:${port}`;
    const stderrLines: string[] = [];
    const originalStderr = console.error;

    console.error = (...args: unknown[]) => {
      stderrLines.push(args.map(String).join(" "));
    };

    try {
      await expect(
        assertPhase1UxConvergence(baseUrl, {
          docsShellOptions: { timeoutMs: 2_000 },
          homeSearchEntryOptions: { timeoutMs: 2_000 },
          readerConvergenceOptions: {
            readerRouteOptions: { timeoutMs: 2_000 },
            tagsNavigationOptions: { timeoutMs: 2_000 },
          },
        }),
      ).rejects.toThrow(
        "Phase 1 home search entry convergence verification failed",
      );

      const stderr = stderrLines.join("\n");
      expect(stderr).toContain(`${baseUrl}/`);
      expect(stderr).toContain(REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE);
      expect(stderr).not.toContain(`${baseUrl}/tags`);
    } finally {
      console.error = originalStderr;
      httpServer.closeAllConnections();
      httpServer.close();
    }
  });
});
