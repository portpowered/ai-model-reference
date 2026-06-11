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
    }
  } finally {
    await closePlaywrightBrowserWithTimeout(browser);
  }

  const issues = mergeRenderedQualityIssues([
    ...htmlIssueGroups,
    ...overflowIssueGroups,
  ]);

  return buildRenderedQualityAuditResult({
    issues,
    routesVisited,
    viewportChecks: routes.length * viewports.length,
  });
}
