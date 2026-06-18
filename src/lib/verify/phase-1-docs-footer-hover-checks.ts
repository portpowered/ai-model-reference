import type { Browser, Locator, Page } from "playwright";
import { docsPageFooterCardSelector } from "@/features/docs/styles/docs-page-footer-chrome";
import { FOOTER_DIRECTIONAL_SUBLABELS } from "@/lib/navigation/docs-page-footer-contract";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

export const PHASE_1_DOCS_FOOTER_HOVER_ROUTE = "/docs/glossary/token";

export type FooterHoverCard = "previous" | "next";

export type FooterHoverInteraction = "hover" | "focus-visible";

export type FooterHoverPaintSnapshot = {
  anchorColor: string;
  sublabelColor: string;
  focusOutlineWidth: string;
  focusBoxShadow: string;
};

export type Phase1DocsFooterHoverCheckFailure = {
  card: FooterHoverCard;
  interaction: FooterHoverInteraction;
  reason: string;
};

export type RunPhase1DocsFooterHoverChecksOptions = {
  timeoutMs?: number;
  launchBrowser?: () => Promise<Browser>;
  /**
   * Test hook: when set, skips Playwright and runs this checker per card/interaction.
   */
  runFooterHoverCheck?: (
    baseUrl: string,
    card: FooterHoverCard,
    interaction: FooterHoverInteraction,
    timeoutMs: number,
  ) => Promise<string | null>;
};

/** Default browser deadline for footer hover paint checks. */
export const DEFAULT_DOCS_FOOTER_HOVER_TIMEOUT_MS = 10_000;

export function colorsMatch(left: string, right: string): boolean {
  return left.trim() === right.trim();
}

/** Parses the widest ring width from outline and box-shadow focus indicators. */
export function readFooterFocusRingWidthPx(
  snapshot: FooterHoverPaintSnapshot,
): number {
  const outlineWidth = Number.parseFloat(snapshot.focusOutlineWidth);
  let maxWidth = Number.isFinite(outlineWidth) ? outlineWidth : 0;

  if (snapshot.focusBoxShadow.trim() === "none") {
    return maxWidth;
  }

  for (const segment of snapshot.focusBoxShadow.split(",")) {
    const spreadMatch = segment.match(/\s(-?\d+(?:\.\d+)?)px\s*$/);
    if (!spreadMatch) {
      continue;
    }
    const spread = Number.parseFloat(spreadMatch[1] ?? "");
    if (Number.isFinite(spread)) {
      maxWidth = Math.max(maxWidth, Math.abs(spread));
    }
  }

  return maxWidth;
}

/**
 * Pure paint outcome for a footer card interaction — used by Playwright and unit tests.
 */
export function evaluateFooterHoverPaintSnapshot(
  snapshot: FooterHoverPaintSnapshot,
  card: FooterHoverCard,
  interaction: FooterHoverInteraction,
): string | null {
  if (!colorsMatch(snapshot.anchorColor, snapshot.sublabelColor)) {
    return `${card} footer card ${interaction}: sublabel color (${snapshot.sublabelColor}) does not match anchor color (${snapshot.anchorColor})`;
  }

  if (interaction === "focus-visible") {
    const focusRingWidthPx = readFooterFocusRingWidthPx(snapshot);
    if (focusRingWidthPx < 2) {
      return `${card} footer card focus-visible: expected focus ring width >= 2px, received outline=${snapshot.focusOutlineWidth} box-shadow=${snapshot.focusBoxShadow}`;
    }
  }

  return null;
}

export function formatPhase1DocsFooterHoverCheckFailure(
  failure: Phase1DocsFooterHoverCheckFailure,
): string {
  return `${failure.card}?interaction=${encodeURIComponent(failure.interaction)}: ${failure.reason}`;
}

function footerCardLocator(page: Page, sublabel: string): Locator {
  return page
    .locator(docsPageFooterCardSelector)
    .filter({
      has: page.locator("p.text-fd-muted-foreground", { hasText: sublabel }),
    })
    .first();
}

async function readFooterHoverPaintSnapshot(
  anchor: Locator,
): Promise<FooterHoverPaintSnapshot> {
  return anchor.evaluate((element) => {
    const sublabel = element.querySelector("p.text-fd-muted-foreground");
    const anchorStyle = getComputedStyle(element);
    const sublabelStyle = sublabel ? getComputedStyle(sublabel) : anchorStyle;

    return {
      anchorColor: anchorStyle.color,
      sublabelColor: sublabelStyle.color,
      focusOutlineWidth: anchorStyle.outlineWidth,
      focusBoxShadow: anchorStyle.boxShadow,
    };
  });
}

async function probePreviousFooterHover(
  page: Page,
  timeoutMs: number,
): Promise<string | null> {
  const anchor = footerCardLocator(page, FOOTER_DIRECTIONAL_SUBLABELS.previous);
  await anchor.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {});
  const visible = await anchor.isVisible().catch(() => false);
  if (!visible) {
    return "Previous Page footer card not visible";
  }

  await anchor.hover({ timeout: timeoutMs });
  const snapshot = await readFooterHoverPaintSnapshot(anchor);
  return evaluateFooterHoverPaintSnapshot(snapshot, "previous", "hover");
}

async function probeNextFooterFocusVisible(
  page: Page,
  timeoutMs: number,
): Promise<string | null> {
  const previousAnchor = footerCardLocator(
    page,
    FOOTER_DIRECTIONAL_SUBLABELS.previous,
  );
  const anchor = footerCardLocator(page, FOOTER_DIRECTIONAL_SUBLABELS.next);
  await anchor.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {});
  const visible = await anchor.isVisible().catch(() => false);
  if (!visible) {
    return "Next Page footer card not visible";
  }

  await previousAnchor
    .scrollIntoViewIfNeeded({ timeout: timeoutMs })
    .catch(() => {});
  const previousVisible = await previousAnchor.isVisible().catch(() => false);
  if (!previousVisible) {
    return "Previous Page footer card not visible";
  }

  await page.mouse.move(1, 1).catch(() => {});
  await previousAnchor.focus({ timeout: timeoutMs });
  await page.keyboard.press("Tab");

  const isFocused = await anchor.evaluate(
    (element) => document.activeElement === element,
  );
  if (!isFocused) {
    return "Next Page footer card did not receive keyboard focus";
  }

  await anchor.scrollIntoViewIfNeeded({ timeout: timeoutMs }).catch(() => {});
  await page.waitForTimeout(100);
  const snapshot = await readFooterHoverPaintSnapshot(anchor);
  return evaluateFooterHoverPaintSnapshot(snapshot, "next", "focus-visible");
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

/**
 * Playwright probe: footer sublabel foreground matches anchor on hover and focus-visible.
 */
export async function probeDocsFooterHoverPaint(
  page: Page,
  baseUrl: string,
  timeoutMs: number = DEFAULT_DOCS_FOOTER_HOVER_TIMEOUT_MS,
): Promise<string | null> {
  await page.goto(
    `${normalizeVerifyBaseUrl(baseUrl)}${PHASE_1_DOCS_FOOTER_HOVER_ROUTE}`,
    {
      timeout: timeoutMs,
      waitUntil: "load",
    },
  );

  const previousReason = await probePreviousFooterHover(page, timeoutMs);
  if (previousReason) {
    return previousReason;
  }

  return probeNextFooterFocusVisible(page, timeoutMs);
}

async function runDefaultFooterHoverCheck(
  baseUrl: string,
  card: FooterHoverCard,
  interaction: FooterHoverInteraction,
  timeoutMs: number,
  launchBrowser: () => Promise<Browser>,
): Promise<string | null> {
  const browser = await launchBrowser();
  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);
    await page.goto(
      `${normalizeVerifyBaseUrl(baseUrl)}${PHASE_1_DOCS_FOOTER_HOVER_ROUTE}`,
      {
        timeout: timeoutMs,
        waitUntil: "load",
      },
    );

    if (card === "previous" && interaction === "hover") {
      return await probePreviousFooterHover(page, timeoutMs);
    }

    if (card === "next" && interaction === "focus-visible") {
      return await probeNextFooterFocusVisible(page, timeoutMs);
    }

    return `unsupported footer hover check: ${card}/${interaction}`;
  } finally {
    await browser.close();
  }
}

/**
 * Runs Playwright footer hover/focus-visible paint checks on the production build.
 */
export async function runPhase1DocsFooterHoverChecks(
  baseUrl: string,
  options: RunPhase1DocsFooterHoverChecksOptions = {},
): Promise<Phase1DocsFooterHoverCheckFailure[]> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_DOCS_FOOTER_HOVER_TIMEOUT_MS;
  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
  const checks: Array<{
    card: FooterHoverCard;
    interaction: FooterHoverInteraction;
  }> = [
    { card: "previous", interaction: "hover" },
    { card: "next", interaction: "focus-visible" },
  ];

  const failures: Phase1DocsFooterHoverCheckFailure[] = [];

  for (const check of checks) {
    const reason = options.runFooterHoverCheck
      ? await options.runFooterHoverCheck(
          baseUrl,
          check.card,
          check.interaction,
          timeoutMs,
        )
      : await runDefaultFooterHoverCheck(
          baseUrl,
          check.card,
          check.interaction,
          timeoutMs,
          launchBrowser,
        );

    if (reason) {
      failures.push({
        card: check.card,
        interaction: check.interaction,
        reason,
      });
    }
  }

  return failures;
}
