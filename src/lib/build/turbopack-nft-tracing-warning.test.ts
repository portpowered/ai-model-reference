import { describe, expect, test } from "bun:test";
import {
  buildOutputHasTurbopackWholeProjectTracingWarning,
  firstMatchingTurbopackTracingWarningPattern,
} from "@/lib/build/turbopack-nft-tracing-warning";

describe("buildOutputHasTurbopackWholeProjectTracingWarning", () => {
  test("matches Encountered unexpected file in NFT list diagnostics", () => {
    const output = `
⚠ Encountered unexpected file in NFT list: ./next.config.ts
  The whole project was traced unintentionally.
`;
    expect(buildOutputHasTurbopackWholeProjectTracingWarning(output)).toBe(
      true,
    );
    expect(firstMatchingTurbopackTracingWarningPattern(output)).toBeDefined();
  });

  test("matches import trace through next.config with node:fs", () => {
    const output = `
⚠ next.config.ts
Import trace:
  ./src/lib/content/glossary-pages.ts
  ./src/lib/content/pages.ts
  node:fs/promises
`;
    expect(buildOutputHasTurbopackWholeProjectTracingWarning(output)).toBe(
      true,
    );
  });

  test("does not match unrelated build warnings", () => {
    const output = `
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully in 4.0s
`;
    expect(buildOutputHasTurbopackWholeProjectTracingWarning(output)).toBe(
      false,
    );
  });
});
