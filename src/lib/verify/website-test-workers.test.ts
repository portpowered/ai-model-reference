import { describe, expect, test } from "bun:test";
import {
  isCiEnvironment,
  resolveWebsiteTestParallelWorkers,
} from "./website-test-workers";

function env(overrides: Partial<NodeJS.ProcessEnv> = {}): NodeJS.ProcessEnv {
  return {
    NODE_ENV: "test",
    ...overrides,
  };
}

describe("website test worker resolution", () => {
  test("detects common CI environments", () => {
    expect(isCiEnvironment(env())).toBe(false);
    expect(isCiEnvironment(env({ CI: "true" }))).toBe(true);
    expect(isCiEnvironment(env({ GITHUB_ACTIONS: "true" }))).toBe(true);
  });

  test("defaults to a single worker on CI", () => {
    expect(
      resolveWebsiteTestParallelWorkers({
        defaultWorkers: 4,
        env: env({ CI: "true" }),
      }),
    ).toBe(1);
    expect(
      resolveWebsiteTestParallelWorkers({
        defaultWorkers: 4,
        env: env({ GITHUB_ACTIONS: "true" }),
      }),
    ).toBe(1);
  });

  test("uses the local default outside CI", () => {
    expect(
      resolveWebsiteTestParallelWorkers({
        defaultWorkers: 4,
        env: env(),
      }),
    ).toBe(4);
  });

  test("allows explicit worker override even on CI", () => {
    expect(
      resolveWebsiteTestParallelWorkers({
        defaultWorkers: 4,
        env: env({ CI: "true", WEBSITE_TEST_PARALLEL_WORKERS: "3" }),
      }),
    ).toBe(3);
  });

  test("ignores invalid worker overrides", () => {
    expect(
      resolveWebsiteTestParallelWorkers({
        defaultWorkers: 4,
        env: env({ WEBSITE_TEST_PARALLEL_WORKERS: "0" }),
      }),
    ).toBe(4);
    expect(
      resolveWebsiteTestParallelWorkers({
        defaultWorkers: 4,
        env: env({ CI: "true", WEBSITE_TEST_PARALLEL_WORKERS: "nope" }),
      }),
    ).toBe(1);
  });
});
