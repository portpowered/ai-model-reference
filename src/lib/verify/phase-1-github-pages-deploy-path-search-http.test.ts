import { describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
  DEPLOY_PATH_SEARCH_QUERIES,
} from "./phase-1-github-pages-deploy-path-search";
import {
  deriveDeployPathSearchEvidenceFromHarnessOutcome,
  runPhase1DeployPathSearchChecks,
} from "./phase-1-github-pages-deploy-path-search-http";
import {
  acquireStaticExportVerifySession,
  DEPLOY_PATH_VERIFY_BASE_URL_UNCERTAIN_REASON,
} from "./phase-1-github-pages-deploy-static-harness";
import { VERIFY_BASE_URL_ENV } from "./server-lifecycle";

function writeOutFixture(rootDir: string): void {
  writeFileSync(
    join(rootDir, "index.html"),
    "<html>deploy-path-search-home</html>",
  );
}

describe("runPhase1DeployPathSearchChecks", () => {
  test("returns pass rows for all queries when injected search checks pass", async () => {
    const rows = await runPhase1DeployPathSearchChecks(
      "http://127.0.0.1:3200",
      {
        searchPageOptions: { runQueryCheck: async () => null },
      },
    );

    expect(rows).toHaveLength(DEPLOY_PATH_SEARCH_QUERIES.length);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every(
        (row) => row.checklistRow === DEPLOY_PATH_SEARCH_CHECKLIST_ROW,
      ),
    ).toBe(true);
    expect(rows.map((row) => row.query)).toEqual([
      ...DEPLOY_PATH_SEARCH_QUERIES,
    ]);
  });

  test("returns fail rows with reasons from injected search check failures", async () => {
    const rows = await runPhase1DeployPathSearchChecks(
      "http://127.0.0.1:3200",
      {
        queries: ["GQA", "attention"],
        searchPageOptions: {
          runQueryCheck: async (_baseUrl, query) =>
            query === "GQA" ? null : `forced failure for ${query}`,
        },
      },
    );

    expect(rows).toHaveLength(2);
    expect(rows[0]?.status).toBe("pass");
    expect(rows[1]?.status).toBe("fail");
    expect(rows[1]?.reason).toBe("forced failure for attention");
  });
});

describe("deriveDeployPathSearchEvidenceFromHarnessOutcome", () => {
  test("runs search checks and tears down harness session on pass", async () => {
    const root = mkdtempSync(join(tmpdir(), "deploy-path-search-pass-"));
    writeOutFixture(root);

    const harnessOutcome = await acquireStaticExportVerifySession({
      outDir: root,
      port: 3197,
    });

    expect(harnessOutcome.status).toBe("pass");
    if (harnessOutcome.status !== "pass") {
      return;
    }

    const evidence = await deriveDeployPathSearchEvidenceFromHarnessOutcome(
      harnessOutcome,
      {
        searchPageOptions: { runQueryCheck: async () => null },
      },
    );

    expect(evidence.status).toBe("pass");
    expect(evidence.rows).toHaveLength(3);

    await expect(
      fetch(`http://127.0.0.1:3197/`, { signal: AbortSignal.timeout(1000) }),
    ).rejects.toThrow();

    rmSync(root, { recursive: true, force: true });
  });

  test("returns fail evidence when harness acquisition fails", async () => {
    const missingDir = join(
      tmpdir(),
      `deploy-path-search-missing-${Date.now()}`,
    );
    const harnessOutcome = await acquireStaticExportVerifySession({
      outDir: missingDir,
    });

    expect(harnessOutcome.status).toBe("fail");
    if (harnessOutcome.status !== "fail") {
      return;
    }

    const evidence =
      await deriveDeployPathSearchEvidenceFromHarnessOutcome(harnessOutcome);

    expect(evidence.status).toBe("fail");
    expect(evidence.reason).toContain("Missing export directory");
    expect(evidence.rows).toEqual([]);
  });

  test("returns uncertain evidence when VERIFY_BASE_URL is set", async () => {
    const harnessOutcome = await acquireStaticExportVerifySession({
      env: {
        [VERIFY_BASE_URL_ENV]: "http://127.0.0.1:3997",
      },
    });

    expect(harnessOutcome.status).toBe("uncertain");
    if (harnessOutcome.status !== "uncertain") {
      return;
    }

    const evidence =
      await deriveDeployPathSearchEvidenceFromHarnessOutcome(harnessOutcome);

    expect(evidence.status).toBe("uncertain");
    expect(evidence.reason).toBe(DEPLOY_PATH_VERIFY_BASE_URL_UNCERTAIN_REASON);
    await harnessOutcome.session.cleanup();
  });

  test("returns fail evidence when search checks report query failures", async () => {
    const root = mkdtempSync(join(tmpdir(), "deploy-path-search-fail-"));
    mkdirSync(root, { recursive: true });
    writeOutFixture(root);

    const harnessOutcome = await acquireStaticExportVerifySession({
      outDir: root,
      port: 3198,
    });

    expect(harnessOutcome.status).toBe("pass");
    if (harnessOutcome.status !== "pass") {
      return;
    }

    const evidence = await deriveDeployPathSearchEvidenceFromHarnessOutcome(
      harnessOutcome,
      {
        searchPageOptions: {
          runQueryCheck: async (_baseUrl, query) =>
            query === "KV cache"
              ? "missing grouped-query-attention result"
              : null,
        },
      },
    );

    expect(evidence.status).toBe("fail");
    expect(
      evidence.rows.some(
        (row) => row.query === "KV cache" && row.status === "fail",
      ),
    ).toBe(true);

    rmSync(root, { recursive: true, force: true });
  });
});
