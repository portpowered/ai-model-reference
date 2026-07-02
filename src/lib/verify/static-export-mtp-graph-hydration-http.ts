import type { Browser, Page } from "playwright";
import { REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS } from "@/features/models/components/registry-graph-flow-theme";
import { exportHtmlIncludesMtpAttentionVariantGraphShellMarkers } from "@/lib/build/verify-export-base-path";
import { MULTI_TOKEN_PREDICTION_ROUTE } from "@/lib/verify/multi-token-prediction-module-convergence";
import { withExportIntegrationProbeLock } from "./export-integration-probe-lock";
import { httpGetText } from "./http-harness";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const DEFAULT_MTP_GRAPH_HYDRATION_TIMEOUT_MS = 45_000;

const MTP_GRAPH_ROUTE = MULTI_TOKEN_PREDICTION_ROUTE;

type MtpVariant = "nextToken" | "mtp";

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

function isTransientMtpGraphProbeError(reason: string): boolean {
  return (
    reason.includes("Target page, context or browser has been closed") ||
    reason.includes("browser has been closed")
  );
}

async function sleep(ms: number): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForAttentionVariantActive(
  page: Page,
  variant: MtpVariant,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await page.waitForFunction(
      (expected) => {
        const comparison = document.querySelector(
          '[data-attention-variant-comparison="true"]',
        );
        return (
          comparison?.getAttribute("data-attention-variant-active") === expected
        );
      },
      variant,
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

async function waitForGraphId(
  page: Page,
  graphId: string,
  timeoutMs: number,
): Promise<boolean> {
  try {
    await page.waitForFunction(
      (expected) => {
        const graph = document.querySelector('[data-react-flow-graph="true"]');
        return graph?.getAttribute("data-graph-id") === expected;
      },
      graphId,
      { timeout: timeoutMs },
    );
    return true;
  } catch {
    return false;
  }
}

async function activateAttentionVariantTab(
  page: Page,
  variant: MtpVariant,
  timeoutMs: number,
): Promise<string | null> {
  const comparison = page.locator('[data-attention-variant-comparison="true"]');
  const graphShell = page.locator(
    REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS.graphWrapper,
  );
  await graphShell
    .scrollIntoViewIfNeeded({ timeout: timeoutMs })
    .catch(() => {});
  await comparison
    .scrollIntoViewIfNeeded({ timeout: timeoutMs })
    .catch(() => {});

  await page
    .locator(".react-flow__pane")
    .waitFor({ state: "visible", timeout: timeoutMs })
    .catch(() => {});

  const tab = page.locator(`[data-attention-variant-option="${variant}"]`);
  try {
    await tab.waitFor({ state: "visible", timeout: timeoutMs });
  } catch {
    return `Could not find the ${variant} comparison tab on the MTP module page.`;
  }

  const perAttemptTimeoutMs = Math.min(5_000, Math.max(1_500, timeoutMs / 6));

  for (let attempt = 0; attempt < 3; attempt += 1) {
    await tab.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {});

    try {
      await tab.click({ timeout: perAttemptTimeoutMs });
    } catch {
      // Fall through to keyboard activation when click races hydration.
    }

    if (
      await waitForAttentionVariantActive(page, variant, perAttemptTimeoutMs)
    ) {
      return null;
    }

    try {
      await tab.focus();
      await page.keyboard.press("Enter");
    } catch {
      // Retry after re-scroll when focus is not yet available.
    }

    if (
      await waitForAttentionVariantActive(page, variant, perAttemptTimeoutMs)
    ) {
      return null;
    }

    await page.waitForTimeout(200);
  }

  const activeVariant = await comparison.getAttribute(
    "data-attention-variant-active",
  );
  return `Could not activate the ${variant} comparison tab on the MTP module page (active="${activeVariant ?? "null"}").`;
}

async function verifyMtpGraphHydrationOnPage(
  page: Page,
  timeoutMs: number,
): Promise<string | null> {
  const comparison = page.locator('[data-attention-variant-comparison="true"]');
  try {
    await comparison.waitFor({ state: "attached", timeout: timeoutMs });
  } catch {
    return "MTP comparison graph shell did not appear after hydration.";
  }

  const graphShell = page.locator(
    REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS.graphWrapper,
  );
  try {
    await graphShell.waitFor({ state: "attached", timeout: timeoutMs });
  } catch {
    return "React Flow graph shell did not appear on the MTP module page.";
  }

  const nodeCountRaw = await graphShell.getAttribute("data-graph-node-count");
  const nodeCount = Number(nodeCountRaw ?? "0");
  if (!Number.isFinite(nodeCount) || nodeCount < 1) {
    return "React Flow graph shell hydrated without registered node markers.";
  }

  const graphNodeMarkers = page.locator(
    REGISTRY_GRAPH_FLOW_MANUAL_VISIBILITY_SELECTORS.srOnlyNodeLabels,
  );
  try {
    await graphNodeMarkers
      .first()
      .waitFor({ state: "attached", timeout: timeoutMs });
  } catch {
    return "React Flow graph hydrated without accessible node markers on the MTP module page.";
  }

  if (!(await waitForAttentionVariantActive(page, "mtp", timeoutMs))) {
    const activeVariant = await comparison.getAttribute(
      "data-attention-variant-active",
    );
    return `Expected default MTP variant "mtp", received "${activeVariant ?? "null"}".`;
  }

  const nextTokenActivationReason = await activateAttentionVariantTab(
    page,
    "nextToken",
    timeoutMs,
  );
  if (nextTokenActivationReason) {
    return nextTokenActivationReason;
  }

  if (
    !(await waitForGraphId(
      page,
      "graph.multi-token-prediction-next-token-comparison",
      timeoutMs,
    ))
  ) {
    const graphIdAfterNextToken = await page
      .locator('[data-react-flow-graph="true"]')
      .getAttribute("data-graph-id");
    return `Expected next-token graph id after toggle, received "${graphIdAfterNextToken ?? "null"}".`;
  }

  const mtpActivationReason = await activateAttentionVariantTab(
    page,
    "mtp",
    timeoutMs,
  );
  if (mtpActivationReason) {
    return mtpActivationReason;
  }

  return null;
}

/**
 * Verifies the exported MTP module graph hydrates and toggles next-token/MTP when
 * served from a static export HTTP server (including GitHub Pages base paths).
 */
export async function verifyStaticExportMtpGraphHydration(
  baseUrl: string,
  options: {
    timeoutMs?: number;
    launchBrowser?: () => Promise<Browser>;
  } = {},
): Promise<string | null> {
  return withExportIntegrationProbeLock(async () => {
    const timeoutMs =
      options.timeoutMs ?? DEFAULT_MTP_GRAPH_HYDRATION_TIMEOUT_MS;
    const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
    const pageUrl = `${normalizeVerifyBaseUrl(baseUrl)}${MTP_GRAPH_ROUTE}`;

    const htmlResponse = await httpGetText(pageUrl, timeoutMs);
    if (htmlResponse.status < 200 || htmlResponse.status >= 300) {
      return `MTP module export route returned HTTP ${htmlResponse.status}.`;
    }
    const exportedHtml = htmlResponse.body;
    if (!exportHtmlIncludesMtpAttentionVariantGraphShellMarkers(exportedHtml)) {
      return "MTP export HTML lacks attention-variant comparison graph shell markers.";
    }
    if (!/\bclass=["'][^"']*react-flow/.test(exportedHtml)) {
      return "React Flow canvas did not hydrate on the MTP module page.";
    }

    const maxAttempts =
      process.env.CI === "true" || process.env.GITHUB_ACTIONS === "true"
        ? 3
        : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      const browser = await launchBrowser();
      try {
        const page = await browser.newPage();
        page.setDefaultTimeout(timeoutMs);
        page.setDefaultNavigationTimeout(timeoutMs);
        await page.goto(pageUrl, {
          timeout: timeoutMs,
          waitUntil: "load",
        });
        await page.waitForTimeout(500);
        const reason = await verifyMtpGraphHydrationOnPage(page, timeoutMs);
        if (
          reason === null ||
          !isTransientMtpGraphProbeError(reason) ||
          attempt === maxAttempts
        ) {
          return reason;
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (
          !isTransientMtpGraphProbeError(message) ||
          attempt === maxAttempts
        ) {
          return message;
        }
      } finally {
        await closePlaywrightBrowserWithTimeout(browser);
      }

      await sleep(2_000);
    }

    return "MTP graph hydration probe exhausted retry attempts.";
  });
}
