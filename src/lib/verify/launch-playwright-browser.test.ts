import { describe, expect, test } from "bun:test";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  isPlaywrightLaunchRetryableError,
  isPlaywrightLaunchTimeoutError,
  resolvePlaywrightChromiumExecutablePath,
} from "./launch-playwright-browser";

describe("launchPlaywrightBrowser helpers", () => {
  test("detects Playwright launch timeout errors", () => {
    const error = new Error("launch: Timeout 120000ms exceeded.");
    error.name = "TimeoutError";
    expect(isPlaywrightLaunchTimeoutError(error)).toBe(true);
    expect(isPlaywrightLaunchTimeoutError(new Error("other"))).toBe(false);
  });

  test("detects transient CI spawn connect failures as retryable", () => {
    const connectError = new Error("Failed to connect");
    expect(isPlaywrightLaunchRetryableError(connectError)).toBe(true);

    const enoent = new Error("Failed to connect") as NodeJS.ErrnoException;
    enoent.code = "ENOENT";
    enoent.errno = -2;
    expect(isPlaywrightLaunchRetryableError(enoent)).toBe(true);

    const refused = new Error("connect ECONNREFUSED");
    (refused as NodeJS.ErrnoException).code = "ECONNREFUSED";
    expect(isPlaywrightLaunchRetryableError(refused)).toBe(true);

    expect(isPlaywrightLaunchRetryableError(new Error("other"))).toBe(false);
  });

  test("prefers explicit executable override from env", () => {
    const overridePath = join(
      mkdtempSync(join(tmpdir(), "playwright-override-")),
      "custom-chrome",
    );
    writeFileSync(overridePath, "");

    expect(
      resolvePlaywrightChromiumExecutablePath({
        env: {
          PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH: overridePath,
        },
        bundledExecutablePath: "/missing/bundled-chromium",
        systemChromePath: "/missing/system-chrome",
      }),
    ).toBe(overridePath);
  });

  test("uses system Chrome when the bundled Playwright browser is missing", () => {
    const systemChromePath = join(
      mkdtempSync(join(tmpdir(), "playwright-system-")),
      "Google Chrome",
    );
    writeFileSync(systemChromePath, "");

    expect(
      resolvePlaywrightChromiumExecutablePath({
        env: {},
        bundledExecutablePath: "/missing/bundled-chromium",
        systemChromePath,
      }),
    ).toBe(systemChromePath);
  });

  test("keeps the default Playwright executable when the bundled browser exists", () => {
    const bundledExecutablePath = join(
      mkdtempSync(join(tmpdir(), "playwright-bundled-")),
      "chrome-headless-shell",
    );
    writeFileSync(bundledExecutablePath, "");

    expect(
      resolvePlaywrightChromiumExecutablePath({
        env: {},
        bundledExecutablePath,
        systemChromePath: "/missing/system-chrome",
      }),
    ).toBeUndefined();
  });
});
