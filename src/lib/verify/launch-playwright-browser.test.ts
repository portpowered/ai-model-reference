import { describe, expect, test } from "bun:test";
import { isPlaywrightLaunchTimeoutError } from "./launch-playwright-browser";

describe("launchPlaywrightBrowser helpers", () => {
  test("detects Playwright launch timeout errors", () => {
    const error = new Error("launch: Timeout 120000ms exceeded.");
    error.name = "TimeoutError";
    expect(isPlaywrightLaunchTimeoutError(error)).toBe(true);
    expect(isPlaywrightLaunchTimeoutError(new Error("other"))).toBe(false);
  });
});
