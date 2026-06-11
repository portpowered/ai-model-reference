import type { Browser, Page } from "playwright";
import { httpGetText } from "./http-harness";
import {
  closePlaywrightBrowserWithTimeout,
  launchPlaywrightBrowser,
} from "./launch-playwright-browser";
import {
  auditRenderedQualityHtml,
  auditRenderedQualityOverflow,
  buildRenderedQualityAuditResult,
  mergeRenderedQualityIssues,
  RENDERED_QUALITY_AUDIT_ROUTES,
  RENDERED_QUALITY_VIEWPORTS,
  type RenderedQualityAuditResult,
  type RenderedQualityAuditRoute,
  type RenderedQualityIssue,
  type RenderedQualityViewport,
} from "./rendered-quality-baseline";
import {
  auditRenderedQualityGraphInteraction,
  GQA_GRAPH_INTERACTION_ROUTE,
} from "./rendered-quality-baseline-graph-interaction";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const DEFAULT_RENDERED_QUALITY_AUDIT_TIMEOUT_MS = 45_000;

export type RunRenderedQualityBaselineAuditOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  routes?: readonly RenderedQualityAuditRoute[];
  viewports?: readonly RenderedQualityViewport[];
};

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function collectRouteHtmlIssues(
  baseUrl: string,
  route: RenderedQualityAuditRoute,
  timeoutMs: number,
): Promise<{ issues: RenderedQualityIssue[]; status: number | null }> {
  const url = `${normalizeVerifyBaseUrl(baseUrl)}${route.path}`;
  try {
    const { status, body } = await httpGetText(url, timeoutMs);
    if (status !== 200) {
      return {
        status,
        issues: [
          {
            route: route.path,
            routeLabel: route.label,
            viewport: "all",
            lane: "route-renders",
            behavior: "route HTTP status",
            detail: `expected HTTP 200, received ${status}`,
          },
        ],
      };
    }

    return {
      status,
      issues: auditRenderedQualityHtml({ route, html: body, viewport: "all" }),
    };
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "route fetch failed";
    return {
      status: null,
      issues: [
        {
          route: route.path,
          routeLabel: route.label,
          viewport: "all",
          lane: "route-renders",
          behavior: "route fetch",
          detail,
        },
      ],
    };
  }
}

async function readReactFlowViewportTransform(
  page: Page,
): Promise<string | null> {
  return page.locator(".react-flow__viewport").getAttribute("style");
}

async function collectGqaGraphInteractionIssues(
  page: Page,
  route: RenderedQualityAuditRoute,
  viewport: RenderedQualityViewport,
  timeoutMs: number,
): Promise<RenderedQualityIssue[]> {
  const graph = page.locator('[data-react-flow-graph="true"]');
  try {
    await graph.waitFor({ state: "attached", timeout: timeoutMs });
    await graph.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
  } catch (error) {
    const detail =
      error instanceof Error ? error.message : "GQA graph did not hydrate";
    return auditRenderedQualityGraphInteraction({
      route,
      viewport: viewport.id,
      panChanged: false,
      zoomChanged: false,
      mhaToggleWorked: false,
      errorDetail: detail,
    });
  }

  const before = await readReactFlowViewportTransform(page);
  const paneBox = await page.locator(".react-flow__pane").boundingBox();

  if (!paneBox || !before) {
    return auditRenderedQualityGraphInteraction({
      route,
      viewport: viewport.id,
      panChanged: false,
      zoomChanged: false,
      mhaToggleWorked: false,
      errorDetail: "React Flow pane or viewport transform was unavailable",
    });
  }

  const panStartX = paneBox.x + 15;
  const panStartY = paneBox.y + 15;
  await page.mouse.move(panStartX, panStartY);
  await page.mouse.down();
  await page.mouse.move(panStartX + 100, panStartY + 60, { steps: 8 });
  await page.mouse.up();
  await page.waitForTimeout(250);

  const afterPan = await readReactFlowViewportTransform(page);

  await page.mouse.move(paneBox.x + 50, paneBox.y + 50);
  await page.mouse.wheel(0, -400);
  await page.waitForTimeout(250);

  const afterZoom = await readReactFlowViewportTransform(page);

  let mhaToggleWorked = false;
  try {
    const mhaButton = page.locator('[data-attention-variant-option="mha"]');
    await mhaButton.click({ timeout: timeoutMs });
    const activeVariant = await page
      .locator('[data-attention-variant-comparison="true"]')
      .getAttribute("data-attention-variant-active");
    const graphId = await page
      .locator('[data-react-flow-graph="true"]')
      .getAttribute("data-graph-id");
    mhaToggleWorked =
      activeVariant === "mha" &&
      graphId === "graph.grouped-query-attention-mha-comparison";
  } catch {
    mhaToggleWorked = false;
  }

  return auditRenderedQualityGraphInteraction({
    route,
    viewport: viewport.id,
    panChanged: before !== afterPan,
    zoomChanged: afterPan !== afterZoom,
    mhaToggleWorked,
  });
}

async function collectViewportOverflowIssues(
  page: Page,
  baseUrl: string,
  route: RenderedQualityAuditRoute,
  viewport: RenderedQualityViewport,
  timeoutMs: number,
): Promise<RenderedQualityIssue[]> {
  await page.setViewportSize({
    width: viewport.width,
    height: viewport.height,
  });
  await page.goto(`${normalizeVerifyBaseUrl(baseUrl)}${route.path}`, {
    timeout: timeoutMs,
    waitUntil: "domcontentloaded",
  });

  const metrics = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));

  const overflowIssue = auditRenderedQualityOverflow({
    route,
    viewport: viewport.id,
    scrollWidth: metrics.scrollWidth,
    innerWidth: metrics.innerWidth,
  });

  return overflowIssue ? [overflowIssue] : [];
}

/**
 * Visits representative routes over HTTP and Playwright viewports, returning a
 * rendered-quality baseline audit result without mutating production pages.
 */
export async function runRenderedQualityBaselineAudit(
  baseUrl: string,
  options: RunRenderedQualityBaselineAuditOptions = {},
): Promise<RenderedQualityAuditResult> {
  const timeoutMs =
    options.timeoutMs ?? DEFAULT_RENDERED_QUALITY_AUDIT_TIMEOUT_MS;
  const routes = options.routes ?? RENDERED_QUALITY_AUDIT_ROUTES;
  const viewports = options.viewports ?? RENDERED_QUALITY_VIEWPORTS;
  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;

  const htmlIssueGroups: RenderedQualityIssue[][] = [];
  let routesVisited = 0;

  for (const route of routes) {
    const { issues } = await collectRouteHtmlIssues(baseUrl, route, timeoutMs);
    htmlIssueGroups.push(issues);
    routesVisited += 1;
  }

  const browser = await launchBrowser();
  const overflowIssueGroups: RenderedQualityIssue[][] = [];
  const graphInteractionIssueGroups: RenderedQualityIssue[][] = [];
  const gqaRoute = routes.find(
    (route) => route.path === GQA_GRAPH_INTERACTION_ROUTE,
  );

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    page.setDefaultNavigationTimeout(timeoutMs);

    for (const viewport of viewports) {
      for (const route of routes) {
        const issues = await collectViewportOverflowIssues(
          page,
          baseUrl,
          route,
          viewport,
          timeoutMs,
        );
        overflowIssueGroups.push(issues);
      }

      if (gqaRoute) {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });
        await page.goto(`${normalizeVerifyBaseUrl(baseUrl)}${gqaRoute.path}`, {
          timeout: timeoutMs,
          waitUntil: "domcontentloaded",
        });
        const graphIssues = await collectGqaGraphInteractionIssues(
          page,
          gqaRoute,
          viewport,
          timeoutMs,
        );
        graphInteractionIssueGroups.push(graphIssues);
      }
    }
  } finally {
    await closePlaywrightBrowserWithTimeout(browser);
  }

  const issues = mergeRenderedQualityIssues([
    ...htmlIssueGroups,
    ...overflowIssueGroups,
    ...graphInteractionIssueGroups,
  ]);

  const graphInteractionChecks = gqaRoute ? viewports.length : 0;

  return buildRenderedQualityAuditResult({
    issues,
    routesVisited,
    viewportChecks: routes.length * viewports.length + graphInteractionChecks,
  });
}
