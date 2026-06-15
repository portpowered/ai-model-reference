import { describe, expect, test } from "bun:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { runRenderedQualityBaselineAudit } from "@/lib/verify/rendered-quality-baseline-playwright";
import {
  RENDERED_QUALITY_REGRESSION_BASELINE_COMMAND,
  RENDERED_QUALITY_REGRESSION_PASS_COMMAND,
  RENDERED_QUALITY_REGRESSION_UNIT_TEST_COMMAND,
} from "@/lib/verify/rendered-quality-regression";
import { shouldRunVerifyProductionIntegrationTests } from "@/lib/verify/server-lifecycle";

const repoRoot = join(import.meta.dir, "../../..");
const auditReportPath = join(
  repoRoot,
  "docs/internal/rendered-quality-baseline-audit.md",
);

describe("rendered quality baseline audit integration", () => {
  test("package.json exposes rendered-quality verifier scripts", () => {
    const packageJson = JSON.parse(
      readFileSync(join(repoRoot, "package.json"), "utf8"),
    ) as { scripts: Record<string, string> };

    expect(packageJson.scripts["verify:rendered-quality-baseline"]).toContain(
      "run-rendered-quality-baseline-audit.ts",
    );
    expect(packageJson.scripts["verify:rendered-quality-regression"]).toContain(
      "run-rendered-quality-regression-pass.ts",
    );
  });

  test("regression pass documents repeatable unit and baseline commands", () => {
    expect(RENDERED_QUALITY_REGRESSION_UNIT_TEST_COMMAND).toContain("bun test");
    expect(RENDERED_QUALITY_REGRESSION_BASELINE_COMMAND).toContain(
      "verify-rendered-quality-baseline",
    );
    expect(RENDERED_QUALITY_REGRESSION_PASS_COMMAND).toBe(
      "make verify-rendered-quality-regression",
    );
  });

  test("audit report file documents standards gap and issue list headings", () => {
    const report = readFileSync(auditReportPath, "utf8");
    expect(report).toContain("Rendered quality baseline audit");
    expect(report).toContain("## Standards baseline");
    expect(report).toContain("## Implementation-facing issue list");
  });

  test("runRenderedQualityBaselineAudit passes home content standards on built app", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const { acquireVerifyServerSession } = await import(
      "@/lib/verify/server-lifecycle"
    );
    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });

    try {
      const result = await runRenderedQualityBaselineAudit(session.baseUrl, {
        routes: [
          {
            path: "/",
            label: "home",
            kind: "home",
            checksProcessLanguage: true,
          },
        ],
        viewports: [
          { id: "desktop", label: "desktop", width: 1280, height: 800 },
        ],
      });

      expect(result.routesVisited).toBe(1);
      expect(result.viewportChecks).toBe(1);
      expect(result.standards.qualityDocumentsStandardsPresent).toBe(true);
      expect(
        result.issues.filter(
          (issue) => issue.behavior === "customer-visible process language",
        ),
      ).toHaveLength(0);
    } finally {
      await session.cleanup();
    }
  }, 60_000);

  test("runRenderedQualityBaselineAudit passes full representative route set", async () => {
    if (!shouldRunVerifyProductionIntegrationTests(repoRoot)) {
      return;
    }

    const { acquireVerifyServerSession } = await import(
      "@/lib/verify/server-lifecycle"
    );
    const session = await acquireVerifyServerSession({ projectRoot: repoRoot });

    try {
      const result = await runRenderedQualityBaselineAudit(session.baseUrl);

      expect(result.routesVisited).toBeGreaterThanOrEqual(14);
      expect(result.viewportChecks).toBeGreaterThanOrEqual(28);
      expect(result.issues).toHaveLength(0);
    } finally {
      await session.cleanup();
    }
  }, 120_000);
});
