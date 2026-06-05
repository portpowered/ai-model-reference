import { describe, expect, test } from "bun:test";
import {
  evaluateSearchShortcutDomSnapshot,
  formatPhase1SearchShortcutCheckFailure,
  PHASE_1_SEARCH_SHORTCUTS,
  resolveSearchShortcutCheckOptionsFromEnv,
  runPhase1SearchShortcutChecks,
} from "./phase-1-search-shortcut-checks";

describe("PHASE_1_SEARCH_SHORTCUTS", () => {
  test("covers Meta+K and Control+K manual-gate shortcuts", () => {
    expect([...PHASE_1_SEARCH_SHORTCUTS]).toEqual([
      { modifier: "Meta", label: "Meta+K" },
      { modifier: "Control", label: "Control+K" },
    ]);
  });
});

describe("evaluateSearchShortcutDomSnapshot", () => {
  test("passes when dialog and textbox are visible", () => {
    expect(
      evaluateSearchShortcutDomSnapshot(
        { dialogVisible: true, textboxVisible: true },
        "Meta+K",
      ),
    ).toBeNull();
  });

  test("fails when dialog does not open", () => {
    const reason = evaluateSearchShortcutDomSnapshot(
      { dialogVisible: false, textboxVisible: false },
      "Control+K",
    );

    expect(reason).toContain("Control+K");
    expect(reason).toContain("did not open the header search dialog");
  });

  test("fails when dialog opens without a visible textbox", () => {
    const reason = evaluateSearchShortcutDomSnapshot(
      { dialogVisible: true, textboxVisible: false },
      "Meta+K",
    );

    expect(reason).toContain("Meta+K");
    expect(reason).toContain("no visible search textbox");
  });
});

describe("formatPhase1SearchShortcutCheckFailure", () => {
  test("includes surface, encoded shortcut, and reason", () => {
    expect(
      formatPhase1SearchShortcutCheckFailure({
        shortcut: "Meta+K",
        surface: "header-shortcut",
        reason: "dialog missing",
      }),
    ).toBe("header-shortcut?shortcut=Meta%2BK: dialog missing");
  });
});

describe("resolveSearchShortcutCheckOptionsFromEnv", () => {
  test("returns skip when VERIFY_SEARCH_SHORTCUT_SKIP=1", () => {
    expect(
      resolveSearchShortcutCheckOptionsFromEnv({
        VERIFY_SEARCH_SHORTCUT_SKIP: "1",
      }),
    ).toEqual({ skip: true });
  });

  test("returns pass stub when VERIFY_SEARCH_SHORTCUT_STUB=pass", async () => {
    const options = resolveSearchShortcutCheckOptionsFromEnv({
      VERIFY_SEARCH_SHORTCUT_STUB: "pass",
    });

    expect(options.runShortcutCheck).toBeDefined();
    await expect(
      options.runShortcutCheck?.(
        "http://127.0.0.1:1",
        { modifier: "Meta", label: "Meta+K" },
        1000,
      ),
    ).resolves.toBeNull();
  });

  test("returns empty options when env is unset", () => {
    expect(resolveSearchShortcutCheckOptionsFromEnv({})).toEqual({});
  });
});

describe("runPhase1SearchShortcutChecks", () => {
  test("returns no failures when skip is set", async () => {
    const failures = await runPhase1SearchShortcutChecks(
      "http://127.0.0.1:3200",
      { skip: true },
    );

    expect(failures).toEqual([]);
  });

  test("returns no failures when injected shortcut checks pass", async () => {
    const failures = await runPhase1SearchShortcutChecks(
      "http://127.0.0.1:3200",
      {
        runShortcutCheck: async () => null,
      },
    );

    expect(failures).toEqual([]);
  });

  test("returns structured failures from injected shortcut checks", async () => {
    const failures = await runPhase1SearchShortcutChecks(
      "http://127.0.0.1:3200",
      {
        shortcuts: [{ modifier: "Meta", label: "Meta+K" }],
        runShortcutCheck: async (_baseUrl, shortcut) =>
          `forced failure for ${shortcut.label}`,
      },
    );

    const failure = failures[0];
    expect(failures).toEqual([
      {
        shortcut: "Meta+K",
        surface: "header-shortcut",
        reason: "forced failure for Meta+K",
      },
    ]);
    expect(failure).toBeDefined();
    if (!failure) {
      throw new Error("expected a search shortcut check failure");
    }
    expect(formatPhase1SearchShortcutCheckFailure(failure)).toBe(
      "header-shortcut?shortcut=Meta%2BK: forced failure for Meta+K",
    );
  });
});
