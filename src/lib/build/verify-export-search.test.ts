import { describe, expect, test } from "bun:test";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { supportedLocales } from "@/lib/i18n/locale-routing";
import { docsSearchApi } from "@/lib/search/search-server";
import { PHASE_1_GROUPED_QUERY_ATTENTION_URL } from "@/lib/verify/phase-1-search-checks";
import { emitExportSearchIndex } from "./emit-export-search-index";
import { resolveExportSearchBootstrapFilePath } from "./export-search-bootstrap";
import { verifyPhase1ExportSearchFromOutDir } from "./verify-phase-1-export-search";

describe("verifyPhase1ExportSearchFromOutDir", () => {
  test("fails when the bootstrap payload is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-missing-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const result = await verifyPhase1ExportSearchFromOutDir("out", {
      cwd: dir,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing export search bootstrap");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("passes for an emitted advanced Orama bootstrap payload", async () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-ok-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const emitResult = await emitExportSearchIndex({ outDir: "out", cwd: dir });
    expect(emitResult.ok).toBe(true);

    const verifyResult = await verifyPhase1ExportSearchFromOutDir("out", {
      cwd: dir,
    });
    expect(verifyResult.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  test("emits locale-specific bootstrap payloads for every supported locale", async () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-locales-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const emitResult = await emitExportSearchIndex({ outDir: "out", cwd: dir });
    expect(emitResult.ok).toBe(true);

    for (const locale of supportedLocales) {
      const filePath = resolveExportSearchBootstrapFilePath("out", dir, locale);
      expect(existsSync(filePath)).toBe(true);

      const payload = JSON.parse(readFileSync(filePath, "utf8")) as {
        type: string;
      };
      expect(payload.type).toBe("advanced");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when bootstrap JSON is not advanced Orama", async () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-invalid-"));
    mkdirSync(join(dir, "out", "api"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");
    writeFileSync(
      join(dir, "out", "api", "search"),
      JSON.stringify({ type: "simple" }),
      "utf8",
    );

    const result = await verifyPhase1ExportSearchFromOutDir("out", {
      cwd: dir,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("not valid advanced Orama JSON");
    }

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when bootstrap payload omits grouped-query attention", async () => {
    const dir = mkdtempSync(join(tmpdir(), "export-search-no-gqa-"));
    mkdirSync(join(dir, "out", "api"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const payload = await docsSearchApi.export();
    const serialized = JSON.stringify(payload).replaceAll(
      PHASE_1_GROUPED_QUERY_ATTENTION_URL,
      "/docs/modules/missing-module",
    );
    writeFileSync(join(dir, "out", "api", "search"), serialized, "utf8");

    const result = await verifyPhase1ExportSearchFromOutDir("out", {
      cwd: dir,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain(PHASE_1_GROUPED_QUERY_ATTENTION_URL);
    }

    rmSync(dir, { recursive: true, force: true });
  });
});
