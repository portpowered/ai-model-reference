import { describe, expect, test } from "bun:test";
import {
  isPlaywrightLaunchRetryableError,
  isPlaywrightLaunchTimeoutError,
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
});
