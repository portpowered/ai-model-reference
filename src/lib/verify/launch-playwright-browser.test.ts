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
    const error = new Error("Failed to connect") as NodeJS.ErrnoException;
    error.code = "ENOENT";
    error.errno = -2;
    expect(isPlaywrightLaunchRetryableError(error)).toBe(true);
    expect(isPlaywrightLaunchRetryableError(new Error("other"))).toBe(false);
  });
});
