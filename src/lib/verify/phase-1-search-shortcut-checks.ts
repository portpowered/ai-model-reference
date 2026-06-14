import type { Browser, Page } from "playwright";
import { launchPlaywrightBrowser } from "./launch-playwright-browser";
import { normalizeVerifyBaseUrl } from "./server-lifecycle";

/** Keyboard shortcuts exercised on the built app home page. */
export const PHASE_1_SEARCH_SHORTCUTS = [
  { modifier: "Meta", label: "Meta+K" },
  { modifier: "Control", label: "Control+K" },
] as const;

export type Phase1SearchShortcut = (typeof PHASE_1_SEARCH_SHORTCUTS)[number];

export type Phase1SearchShortcutCheckFailure = {
  shortcut: string;
  surface: "header-shortcut";
  reason: string;
};

export type SearchShortcutDomSnapshot = {
  dialogVisible: boolean;
  textboxVisible: boolean;
};

export const VERIFY_SEARCH_SHORTCUT_STUB_ENV = "VERIFY_SEARCH_SHORTCUT_STUB";
export const VERIFY_SEARCH_SHORTCUT_SKIP_ENV = "VERIFY_SEARCH_SHORTCUT_SKIP";

export type RunPhase1SearchShortcutChecksOptions = {
  timeoutMs?: number;
  shortcuts?: readonly Phase1SearchShortcut[];
  launchBrowser?: () => Promise<Browser>;
  /** When true, skips automated shortcut checks (manual fallback documented in README). */
  skip?: boolean;
  /**
   * Test hook: when set, skips Playwright and runs this checker per shortcut instead.
   */
  runShortcutCheck?: (
    baseUrl: string,
    shortcut: Phase1SearchShortcut,
    timeoutMs: number,
  ) => Promise<string | null>;
};

/** Default browser deadline for keyboard shortcut checks. */
export const DEFAULT_SEARCH_SHORTCUT_TIMEOUT_MS = 30_000;

const SEARCH_DIALOG_TRIGGER_SELECTOR = "button[data-search]";
const SEARCH_SHORTCUT_RETRY_ATTEMPTS = 2;

export function formatPhase1SearchShortcutCheckFailure(
  failure: Phase1SearchShortcutCheckFailure,
): string {
  return `${failure.surface}?shortcut=${encodeURIComponent(failure.shortcut)}: ${failure.reason}`;
}

/**
 * Pure DOM outcome for a keyboard-opened search dialog — used by Playwright and unit tests.
 */
export function evaluateSearchShortcutDomSnapshot(
  snapshot: SearchShortcutDomSnapshot,
  shortcutLabel: string,
): string | null {
  if (!snapshot.dialogVisible) {
    return `${shortcutLabel} did not open the header search dialog on the home page`;
  }

  if (!snapshot.textboxVisible) {
    return `${shortcutLabel} opened the dialog but no visible search textbox was found`;
  }

  return null;
}

/**
 * Resolves shortcut check options from env:
 * - VERIFY_SEARCH_SHORTCUT_SKIP=1 skips automated checks (manual fallback).
 * - VERIFY_SEARCH_SHORTCUT_STUB=pass injects a passing stub for static HTTP fixtures.
 */
export function resolveSearchShortcutCheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): RunPhase1SearchShortcutChecksOptions {
  const skip = env[VERIFY_SEARCH_SHORTCUT_SKIP_ENV]?.trim();
  if (skip === "1" || skip?.toLowerCase() === "true") {
    return { skip: true };
  }

  const stub = env[VERIFY_SEARCH_SHORTCUT_STUB_ENV]?.trim();
  if (stub === "pass") {
    return { runShortcutCheck: async () => null };
  }

  return {};
}

async function defaultLaunchBrowser(): Promise<Browser> {
  return launchPlaywrightBrowser();
}

async function readSearchShortcutDomSnapshot(
  page: Page,
  timeoutMs: number,
): Promise<SearchShortcutDomSnapshot> {
  const dialog = page.getByRole("dialog", { name: "Search" });
  const dialogVisible = await dialog.isVisible().catch(() => false);

  if (!dialogVisible) {
    return { dialogVisible: false, textboxVisible: false };
  }

  const textbox = dialog.getByRole("textbox");
  let textboxVisible = false;
  try {
    await textbox.waitFor({ state: "visible", timeout: timeoutMs });
    textboxVisible = true;
  } catch {
    textboxVisible = false;
  }

  return { dialogVisible, textboxVisible };
}

async function ensureSearchDialogClosed(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const dialog = page.getByRole("dialog", { name: "Search" });
  if (await dialog.isVisible().catch(() => false)) {
    await page.keyboard.press("Escape");
    await dialog
      .waitFor({ state: "hidden", timeout: timeoutMs })
      .catch(() => {});
  }
}

async function waitForSearchShortcutSurfaceReady(
  page: Page,
  timeoutMs: number,
): Promise<void> {
  const trigger = page.locator(SEARCH_DIALOG_TRIGGER_SELECTOR).first();
  await trigger.waitFor({ state: "visible", timeout: timeoutMs });
  await page.locator("body").click({ position: { x: 8, y: 8 }, force: true });
}

function searchShortcutKey(shortcut: Phase1SearchShortcut): string {
  return shortcut.modifier === "Meta" ? "Meta+KeyK" : "Control+KeyK";
}

async function tryOpenSearchDialogWithShortcut(
  page: Page,
  shortcut: Phase1SearchShortcut,
  timeoutMs: number,
): Promise<string | null> {
  await page.keyboard.press(searchShortcutKey(shortcut));

  try {
    const dialog = page.getByRole("dialog", { name: "Search" });
    await dialog.waitFor({ state: "visible", timeout: timeoutMs });
  } catch {
    return `${shortcut.label} did not open the header search dialog on the home page`;
  }

  const snapshot = await readSearchShortcutDomSnapshot(page, timeoutMs);
  return evaluateSearchShortcutDomSnapshot(snapshot, shortcut.label);
}

/**
 * Presses a keyboard shortcut on the home page and returns a failure reason,
 * or null when the search dialog opens with a visible textbox.
 */
export async function checkSearchShortcut(
  page: Page,
  baseUrl: string,
  shortcut: Phase1SearchShortcut,
  timeoutMs: number = DEFAULT_SEARCH_SHORTCUT_TIMEOUT_MS,
): Promise<string | null> {
  const homeUrl = normalizeVerifyBaseUrl(baseUrl);
  await page.goto(homeUrl, {
    timeout: timeoutMs,
    waitUntil: "domcontentloaded",
  });

  await waitForSearchShortcutSurfaceReady(page, timeoutMs);
  await ensureSearchDialogClosed(page, timeoutMs);

  let lastReason: string | null = null;
  for (
    let attempt = 0;
    attempt < SEARCH_SHORTCUT_RETRY_ATTEMPTS;
    attempt += 1
  ) {
    lastReason = await tryOpenSearchDialogWithShortcut(
      page,
      shortcut,
      timeoutMs,
    );
    if (!lastReason) {
      return null;
    }

    if (attempt < SEARCH_SHORTCUT_RETRY_ATTEMPTS - 1) {
      await ensureSearchDialogClosed(page, timeoutMs);
      await waitForSearchShortcutSurfaceReady(page, timeoutMs);
    }
  }

  return lastReason;
}

/**
 * Runs Playwright checks for Meta+K and Control+K; returns failures.
 */
export async function runPhase1SearchShortcutChecks(
  baseUrl: string,
  options: RunPhase1SearchShortcutChecksOptions = {},
): Promise<Phase1SearchShortcutCheckFailure[]> {
  if (options.skip) {
    return [];
  }

  const shortcuts = options.shortcuts ?? PHASE_1_SEARCH_SHORTCUTS;
  const timeoutMs = options.timeoutMs ?? DEFAULT_SEARCH_SHORTCUT_TIMEOUT_MS;
  const failures: Phase1SearchShortcutCheckFailure[] = [];

  if (options.runShortcutCheck) {
    for (const shortcut of shortcuts) {
      const reason = await options.runShortcutCheck(
        baseUrl,
        shortcut,
        timeoutMs,
      );
      if (reason) {
        failures.push({
          shortcut: shortcut.label,
          surface: "header-shortcut",
          reason,
        });
      }
    }
    return failures;
  }

  const launchBrowser = options.launchBrowser ?? defaultLaunchBrowser;
  const browser = await launchBrowser();

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(timeoutMs);

    for (const shortcut of shortcuts) {
      const reason = await checkSearchShortcut(
        page,
        baseUrl,
        shortcut,
        timeoutMs,
      );
      if (reason) {
        failures.push({
          shortcut: shortcut.label,
          surface: "header-shortcut",
          reason,
        });
      }
    }
  } finally {
    await browser.close();
  }

  return failures;
}

/**
 * Runs keyboard shortcut checks, prints each failure, and throws when any fail.
 */
export async function assertPhase1SearchShortcuts(
  baseUrl: string,
  options: RunPhase1SearchShortcutChecksOptions = {},
): Promise<void> {
  const failures = await runPhase1SearchShortcutChecks(baseUrl, options);

  if (failures.length === 0) {
    return;
  }

  for (const failure of failures) {
    console.error(formatPhase1SearchShortcutCheckFailure(failure));
  }

  throw new Error(
    `Phase 1 search keyboard shortcut verification failed (${failures.length} shortcut/shortcuts)`,
  );
}
