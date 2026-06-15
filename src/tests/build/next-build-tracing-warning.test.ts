import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import { join } from "node:path";
import {
  buildOutputHasTurbopackWholeProjectTracingWarning,
  firstMatchingTurbopackTracingWarningPattern,
} from "@/lib/build/turbopack-nft-tracing-warning";
import { BATCH_013_GLOSSARY_ROUTES } from "@/lib/verify/batch-013-glossary-checks";
import { buildBatch013GlossaryRouteConvergenceRows } from "@/lib/verify/batch-013-glossary-page-convergence";
import { BATCH_013_ROUTE_PATHS } from "@/lib/verify/batch-013-route-checks";
import {
  buildCustomerAskGlossaryBridgeDescriptionRows,
  buildCustomerAskGlossaryRows,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
} from "@/lib/verify/customer-ask-glossary-convergence";
import {
  buildCustomerAskEmbeddingDescriptionLinksRow,
  buildCustomerAskGlossaryNoOpeningSummaryRow,
} from "@/lib/verify/customer-ask-glossary-page-convergence";
import { runPhase1DocsFooterHoverChecks } from "@/lib/verify/phase-1-docs-footer-hover-checks";
import {
  acquireVerifyServerSession,
  shouldRunBuiltHtmlConvergenceTests,
} from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const nextDir = join(repoRoot, ".next");

/**
 * Regression gate for Turbopack NFT whole-project filesystem tracing warnings.
 *
 * Guarded diagnostic fragments (see turbopack-nft-tracing-warning.ts):
 * - "Encountered unexpected file" … "NFT"
 * - "whole project" … "traced unintentionally"
 * - unintentional whole-project filesystem tracing copy
 * - next.config import traces that pull in node:fs from content loaders
 */
describe("next build turbopack NFT tracing warning", () => {
  test(
    "bun run build exits 0 without whole-project NFT tracing warnings",
    () => {
      if (existsSync(nextDir)) {
        rmSync(nextDir, { recursive: true, force: true });
      }

      const result = spawnSync("bun", ["run", "build"], {
        cwd: repoRoot,
        encoding: "utf8",
        env: process.env,
      });

      const combined = `${result.stdout ?? ""}\n${result.stderr ?? ""}`;

      expect(result.status).toBe(0);

      const matchedPattern =
        firstMatchingTurbopackTracingWarningPattern(combined);
      if (matchedPattern !== undefined) {
        throw new Error(
          `Turbopack NFT whole-project tracing warning matched guarded pattern: ${matchedPattern}`,
        );
      }
      expect(buildOutputHasTurbopackWholeProjectTracingWarning(combined)).toBe(
        false,
      );
    },
    { timeout: 180_000 },
  );
});

/**
 * Built `.next/server` glossary HTML convergence probes run in this file
 * immediately after the in-suite production build so they never race a
 * parallel test file or read stale local `.next` artifacts.
 */
describe("post-next-build glossary convergence (built HTML)", () => {
  test("token and embedding built HTML pass batch-012 glossary page checks when present", () => {
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

    const tokenPath = join(
      repoRoot,
      ".next/server/app/docs/glossary/token.html",
    );
    const embeddingPath = join(
      repoRoot,
      ".next/server/app/docs/glossary/embedding.html",
    );

    if (!existsSync(tokenPath) || !existsSync(embeddingPath)) {
      return;
    }

    const tokenRow = buildCustomerAskGlossaryNoOpeningSummaryRow(
      readFileSync(tokenPath, "utf8"),
    );
    const embeddingRow = buildCustomerAskEmbeddingDescriptionLinksRow(
      readFileSync(embeddingPath, "utf8"),
    );

    expect(tokenRow.status).toBe("pass");
    expect(embeddingRow.status).toBe("pass");
  });

  test("reopened glossary routes pass batch-013 convergence checks when present", () => {
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

    const builtRoutes = [
      BATCH_013_GLOSSARY_ROUTES.token,
      BATCH_013_GLOSSARY_ROUTES.embedding,
      BATCH_013_GLOSSARY_ROUTES.vector,
      BATCH_013_GLOSSARY_ROUTES.hiddenSize,
    ] as const;

    const htmlByRoute: Record<string, string> = {};
    for (const route of builtRoutes) {
      const builtPath = join(repoRoot, `.next/server/app${route}.html`);
      if (!existsSync(builtPath)) {
        return;
      }
      htmlByRoute[route] = readFileSync(builtPath, "utf8");
    }

    htmlByRoute[BATCH_013_ROUTE_PATHS.vectorGlossary] =
      htmlByRoute[BATCH_013_GLOSSARY_ROUTES.vector] ?? "";
    htmlByRoute[BATCH_013_ROUTE_PATHS.hiddenSizeGlossary] =
      htmlByRoute[BATCH_013_GLOSSARY_ROUTES.hiddenSize] ?? "";

    const rows = buildBatch013GlossaryRouteConvergenceRows({ htmlByRoute });

    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });

  test("bridge glossary built HTML reports pass for description link checks", () => {
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

    const builtPaths = {
      embedding: join(
        repoRoot,
        ".next/server/app/docs/glossary/embedding.html",
      ),
      vector: join(repoRoot, ".next/server/app/docs/glossary/vector.html"),
      hiddenSize: join(
        repoRoot,
        ".next/server/app/docs/glossary/hidden-size.html",
      ),
    };

    if (
      !existsSync(builtPaths.embedding) ||
      !existsSync(builtPaths.vector) ||
      !existsSync(builtPaths.hiddenSize)
    ) {
      return;
    }

    const rows = buildCustomerAskGlossaryBridgeDescriptionRows({
      embeddingHtml: readFileSync(builtPaths.embedding, "utf8"),
      vectorHtml: readFileSync(builtPaths.vector, "utf8"),
      hiddenSizeHtml: readFileSync(builtPaths.hiddenSize, "utf8"),
    });

    expect(rows).toHaveLength(3);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });

  test("/docs/glossary/token built HTML reports pass for all customer-ask glossary checks", () => {
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

    const builtPath = join(
      repoRoot,
      ".next/server/app/docs/glossary/token.html",
    );
    if (!existsSync(builtPath)) {
      return;
    }

    const rows = buildCustomerAskGlossaryRows(readFileSync(builtPath, "utf8"));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });
});

/**
 * Footer hover Playwright probe runs in this file immediately after the
 * in-suite production build so it does not contend with parallel test files
 * or read stale `.next` artifacts during `make test`.
 */
describe("docs page footer hover convergence (production Playwright)", () => {
  test("production build footer cards invert sublabel foreground on hover and focus-visible", async () => {
    if (process.env.CI === "true") {
      return;
    }
    if (!shouldRunBuiltHtmlConvergenceTests(repoRoot)) {
      return;
    }

    const tokenPath = join(
      repoRoot,
      ".next/server/app/docs/glossary/token.html",
    );
    if (!existsSync(tokenPath)) {
      return;
    }

    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });
    try {
      const failures = await runPhase1DocsFooterHoverChecks(session.baseUrl);
      expect(failures).toEqual([]);
    } finally {
      await session.cleanup();
    }
  }, 120_000);
});
