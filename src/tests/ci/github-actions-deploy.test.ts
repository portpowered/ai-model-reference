import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const deployWorkflowPath = join(repoRoot, ".github/workflows/deploy.yml");
const ciWorkflowPath = join(repoRoot, ".github/workflows/ci.yml");

describe("GitHub Actions deploy workflow", () => {
  test("deploy workflow exists separately from ci.yml", () => {
    expect(existsSync(deployWorkflowPath)).toBe(true);
    expect(existsSync(ciWorkflowPath)).toBe(true);
    expect(deployWorkflowPath).not.toBe(ciWorkflowPath);
  });

  test("deploy workflow triggers on main pushes without replacing CI triggers", () => {
    const deployWorkflow = readFileSync(deployWorkflowPath, "utf8");
    const ciWorkflow = readFileSync(ciWorkflowPath, "utf8");

    expect(deployWorkflow).toMatch(/push:[\s\S]*branches:[\s\S]*- main/);
    expect(deployWorkflow).not.toMatch(/pull_request:/);

    expect(ciWorkflow).toMatch(/push:[\s\S]*branches:[\s\S]*- main/);
    expect(ciWorkflow).toMatch(/pull_request:/);
  });

  test("deploy workflow installs with frozen lockfile then runs make build-export", () => {
    const workflow = readFileSync(deployWorkflowPath, "utf8");

    const setupBunIndex = workflow.indexOf("oven-sh/setup-bun@v2");
    const frozenInstallIndex = workflow.indexOf(
      "bun install --frozen-lockfile",
    );
    const buildExportIndex = workflow.indexOf("run: make build-export");

    expect(setupBunIndex).toBeGreaterThan(-1);
    expect(frozenInstallIndex).toBeGreaterThan(setupBunIndex);
    expect(buildExportIndex).toBeGreaterThan(frozenInstallIndex);
    expect(workflow).not.toMatch(/run:\s*make ci\b/);
    expect(workflow).not.toMatch(/continue-on-error:\s*true/i);
  });

  test("deploy workflow sets GITHUB_PAGES_BASE_PATH for project-site export", () => {
    const workflow = readFileSync(deployWorkflowPath, "utf8");

    expect(workflow).toMatch(/GITHUB_PAGES_BASE_PATH:\s*ai-model-reference/);
  });

  test("deploy workflow publishes out/ with GitHub Pages deployment actions and permissions", () => {
    const workflow = readFileSync(deployWorkflowPath, "utf8");

    expect(workflow).toMatch(/pages:\s*write/);
    expect(workflow).toMatch(/id-token:\s*write/);
    expect(workflow).toMatch(/contents:\s*read/);
    expect(workflow).toMatch(/actions\/configure-pages@v5/);
    expect(workflow).toMatch(/actions\/upload-pages-artifact@v3/);
    expect(workflow).toMatch(/actions\/deploy-pages@v4/);
    expect(workflow).toMatch(/path:\s*out\//);
  });
});
