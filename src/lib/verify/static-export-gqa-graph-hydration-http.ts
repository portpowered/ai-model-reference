import { type Browser, chromium, type Page } from "playwright";
import { exportHtmlIncludesGqaAttentionVariantGraphShellMarkers } from "@/lib/build/verify-export-base-path";
import { httpGetText } from "./http-harness";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "./phase-1-search-checks";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const DEFAULT_GQA_GRAPH_HYDRATION_TIMEOUT_MS = 30_000;

const GQA_GRAPH_ROUTE = PHASE_1_GROUPED_QUERY_ATTENTION_URL;

async function defaultLaunchBrowser(): Promise<Browser> {
  return chromium.launch({ headless: true });
}

async function verifyGqaGraphHydrationOnPage(
  page: Page,
  timeoutMs: number,
): Promise<string | null> {
  const comparison = page.locator('[data-attention-variant-comparison="true"]');
  try {
    await comparison.waitFor({ state: "attached", timeout: timeoutMs });
  } catch {
    return "GQA comparison graph shell did not appear after hydration.";
  }

  const reactFlow = page.locator(".react-flow");
  try {
    await reactFlow.waitFor({ state: "visible", timeout: timeoutMs });
  } catch {
    return "React Flow canvas did not hydrate on the GQA module page.";
  }

  const nodes = page.locator(".react-flow__node");
  try {
    await nodes.first().waitFor({ state: "visible", timeout: timeoutMs });
  } catch {
    return "React Flow canvas hydrated without visible nodes on the GQA module page.";
  }

  const activeVariant = await comparison.getAttribute(
    "data-attention-variant-active",
  );
  if (activeVariant !== "gqa") {
    return `Expected default GQA variant "gqa", received "${activeVariant ?? "null"}".`;
  }

  const mhaButton = page.locator('[data-attention-variant-option="mha"]');
  try {
    await mhaButton.click({ timeout: timeoutMs });
  } catch {
    return "Could not activate the MHA comparison tab on the GQA module page.";
  }

  const activeAfterMha = await comparison.getAttribute(
    "data-attention-variant-active",
  );
  if (activeAfterMha !== "mha") {
    return `Expected active variant "mha" after toggle, received "${activeAfterMha ?? "null"}".`;
  }

  const graphIdAfterMha = await page
    .locator('[data-react-flow-graph="true"]')
    .getAttribute("data-graph-id");
  if (graphIdAfterMha !== "graph.grouped-query-attention-mha-comparison") {
    return `Expected MHA graph id after toggle, received "${graphIdAfterMha ?? "null"}".`;
  }

  const gqaButton = page.locator('[data-attention-variant-option="gqa"]');
  try {
    await gqaButton.click({ timeout: timeoutMs });
  } catch {
    return "Could not re-activate the GQA comparison tab on the GQA module page.";
  }

  const activeAfterGqa = await comparison.getAttribute(
    "data-attention-variant-active",
  );
  if (activeAfterGqa !== "gqa") {
    return `Expected active variant "gqa" after toggle, received "${activeAfterGqa ?? "null"}".`;
  }

  return null;
}

/**
 * Verifies the exported GQA module graph hydrates and toggles MHA/GQA when
 * served from a static export HTTP server (including GitHub Pages base paths).
 */
export async function verifyStaticExportGqaGraphHydration(
  baseUrl: string,
  options: {
    timeoutMs?: number;
    launchBrowser?: () => Promise<Browser>;
  } = {},
): Promise<string | null> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_GQA_GRAPH_HYDRATION_TIMEOUT_MS;
  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
  const pageUrl = `${normalizeVerifyBaseUrl(baseUrl)}${GQA_GRAPH_ROUTE}`;

  const htmlResponse = await httpGetText(pageUrl, timeoutMs);
  if (htmlResponse.status < 200 || htmlResponse.status >= 300) {
    return `GQA module export route returned HTTP ${htmlResponse.status}.`;
  }
  const exportedHtml = htmlResponse.body;
  if (!exportHtmlIncludesGqaAttentionVariantGraphShellMarkers(exportedHtml)) {
    return "GQA export HTML lacks attention-variant comparison graph shell markers.";
  }
  if (!/\bclass=["'][^"']*react-flow/.test(exportedHtml)) {
    return "React Flow canvas did not hydrate on the GQA module page.";
  }

  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);
    await page.goto(pageUrl, {
      timeout: timeoutMs,
      waitUntil: "domcontentloaded",
    });
    return await verifyGqaGraphHydrationOnPage(page, timeoutMs);
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  } finally {
    await browser.close();
  }
}
