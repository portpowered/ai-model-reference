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
    expect(firstMatchingTurbopackTracingWarningPattern(output)).toBe(
      "Encountered unexpected file[\\s\\S]{0,400}?\\bNFT\\b",
    );
  });

  test("matches whole project traced unintentionally copy", () => {
    const output = `
⚠ The whole project was traced unintentionally during NFT analysis.
`;
    expect(buildOutputHasTurbopackWholeProjectTracingWarning(output)).toBe(
      true,
    );
    expect(firstMatchingTurbopackTracingWarningPattern(output)).toContain(
      "whole project",
    );
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
    expect(firstMatchingTurbopackTracingWarningPattern(output)).toContain(
      "next\\.config",
    );
  });

  test("firstMatchingTurbopackTracingWarningPattern returns undefined for clean output", () => {
    const output = `
▲ Next.js 16.2.7 (Turbopack)
✓ Compiled successfully in 4.0s
`;
    expect(buildOutputHasTurbopackWholeProjectTracingWarning(output)).toBe(
      false,
    );
    expect(firstMatchingTurbopackTracingWarningPattern(output)).toBeUndefined();
  });
});
