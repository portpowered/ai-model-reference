import { describe, expect, test } from "bun:test";
import { loadGeneratedDocsSourceBinding } from "@/lib/fumadocs-source-runtime";

describe("fumadocs source runtime", () => {
  test("reports a targeted recovery message when the generated source module is absent", async () => {
    const missingModuleError = Object.assign(
      new Error("Cannot find module '../../.source/server'"),
      {
        code: "MODULE_NOT_FOUND",
      },
    );

    await expect(
      loadGeneratedDocsSourceBinding(async () => {
        throw missingModuleError;
      }),
    ).rejects.toThrow(/make typecheck/);

    try {
      await loadGeneratedDocsSourceBinding(async () => {
        throw missingModuleError;
      });
      throw new Error("expected generated source loader to throw");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toContain("../../.source/server");
      expect((error as Error).message).toContain(
        "bun run prepare:content-runtime && bunx fumadocs-mdx",
      );
      expect((error as Error & { cause?: unknown }).cause).toBe(
        missingModuleError,
      );
    }
  });

  test("preserves unrelated loader failures", async () => {
    const originalError = new Error("unexpected loader failure");

    await expect(
      loadGeneratedDocsSourceBinding(async () => {
        throw originalError;
      }),
    ).rejects.toThrow("unexpected loader failure");

    try {
      await loadGeneratedDocsSourceBinding(async () => {
        throw originalError;
      });
      throw new Error("expected unrelated error to be rethrown");
    } catch (error) {
      expect(error).toBe(originalError);
    }
  });
});
