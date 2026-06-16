import { describe, expect, test } from "bun:test";
import {
  colorsMatch,
  evaluateFooterHoverPaintSnapshot,
  formatPhase1DocsFooterHoverCheckFailure,
  readFooterFocusRingWidthPx,
  runPhase1DocsFooterHoverChecks,
} from "./phase-1-docs-footer-hover-checks";

describe("colorsMatch", () => {
  test("compares trimmed CSS color strings", () => {
    expect(colorsMatch(" rgb(1, 2, 3) ", "rgb(1, 2, 3)")).toBe(true);
    expect(colorsMatch("rgb(1, 2, 3)", "rgb(4, 5, 6)")).toBe(false);
  });
});

describe("readFooterFocusRingWidthPx", () => {
  test("uses the widest outline or box-shadow spread", () => {
    expect(
      readFooterFocusRingWidthPx({
        anchorColor: "rgb(0, 0, 0)",
        sublabelColor: "rgb(0, 0, 0)",
        focusOutlineWidth: "1px",
        focusBoxShadow: "rgb(0, 0, 0) 0px 0px 0px 2px",
      }),
    ).toBe(2);
  });
});

describe("evaluateFooterHoverPaintSnapshot", () => {
  test("passes when anchor and sublabel colors match on hover", () => {
    expect(
      evaluateFooterHoverPaintSnapshot(
        {
          anchorColor: "rgb(10, 20, 30)",
          sublabelColor: "rgb(10, 20, 30)",
          focusOutlineWidth: "0px",
          focusBoxShadow: "none",
        },
        "previous",
        "hover",
      ),
    ).toBeNull();
  });

  test("fails when sublabel color stays muted on hover", () => {
    const reason = evaluateFooterHoverPaintSnapshot(
      {
        anchorColor: "rgb(10, 20, 30)",
        sublabelColor: "rgb(100, 110, 120)",
        focusOutlineWidth: "0px",
        focusBoxShadow: "none",
      },
      "previous",
      "hover",
    );

    expect(reason).toContain("previous footer card hover");
    expect(reason).toContain("does not match anchor color");
  });

  test("requires a visible focus ring on focus-visible", () => {
    const reason = evaluateFooterHoverPaintSnapshot(
      {
        anchorColor: "rgb(10, 20, 30)",
        sublabelColor: "rgb(10, 20, 30)",
        focusOutlineWidth: "0px",
        focusBoxShadow: "none",
      },
      "next",
      "focus-visible",
    );

    expect(reason).toContain("next footer card focus-visible");
    expect(reason).toContain("focus ring width");
  });

  test("passes focus-visible when colors match and box-shadow ring is present", () => {
    expect(
      evaluateFooterHoverPaintSnapshot(
        {
          anchorColor: "rgb(10, 20, 30)",
          sublabelColor: "rgb(10, 20, 30)",
          focusOutlineWidth: "1px",
          focusBoxShadow: "rgb(0, 0, 0) 0px 0px 0px 2px",
        },
        "next",
        "focus-visible",
      ),
    ).toBeNull();
  });
});

describe("formatPhase1DocsFooterHoverCheckFailure", () => {
  test("includes card, encoded interaction, and reason", () => {
    expect(
      formatPhase1DocsFooterHoverCheckFailure({
        card: "previous",
        interaction: "hover",
        reason: "sublabel stayed muted",
      }),
    ).toBe("previous?interaction=hover: sublabel stayed muted");
  });
});

describe("runPhase1DocsFooterHoverChecks", () => {
  test("returns no failures when injected checks pass", async () => {
    const failures = await runPhase1DocsFooterHoverChecks(
      "http://127.0.0.1:3200",
      {
        runFooterHoverCheck: async () => null,
      },
    );

    expect(failures).toEqual([]);
  });

  test("returns structured failures from injected checks", async () => {
    const failures = await runPhase1DocsFooterHoverChecks(
      "http://127.0.0.1:3200",
      {
        runFooterHoverCheck: async (_baseUrl, card, interaction) =>
          `forced failure for ${card}/${interaction}`,
      },
    );

    expect(failures).toEqual([
      {
        card: "previous",
        interaction: "hover",
        reason: "forced failure for previous/hover",
      },
      {
        card: "next",
        interaction: "focus-visible",
        reason: "forced failure for next/focus-visible",
      },
    ]);
  });
});
