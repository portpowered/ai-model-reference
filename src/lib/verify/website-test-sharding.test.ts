import { describe, expect, test } from "bun:test";

import {
  defaultCiWebsiteTestWorkers,
  defaultLocalWebsiteTestWorkers,
  resolveWebsiteTestShardWorkers,
} from "./website-test-sharding";

describe("resolveWebsiteTestShardWorkers", () => {
  test("uses the local default when CI is off", () => {
    expect(
      resolveWebsiteTestShardWorkers(undefined, {
        ci: false,
        parallelism: 8,
      }),
    ).toBe(defaultLocalWebsiteTestWorkers);
  });

  test("uses the lower CI default when CI is on", () => {
    expect(
      resolveWebsiteTestShardWorkers(undefined, {
        ci: true,
        parallelism: 8,
      }),
    ).toBe(defaultCiWebsiteTestWorkers);
  });

  test("caps defaults at one less than available parallelism", () => {
    expect(
      resolveWebsiteTestShardWorkers(undefined, {
        ci: false,
        parallelism: 2,
      }),
    ).toBe(1);
  });

  test("keeps explicit overrides when they are valid", () => {
    expect(
      resolveWebsiteTestShardWorkers("3", {
        ci: true,
        parallelism: 8,
      }),
    ).toBe(3);
  });

  test("falls back to the environment default for invalid overrides", () => {
    expect(
      resolveWebsiteTestShardWorkers("0", {
        ci: true,
        parallelism: 8,
      }),
    ).toBe(defaultCiWebsiteTestWorkers);
  });
});
