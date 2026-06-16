import { beforeAll, describe, expect, test } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { searchResultMetaMapToRecord } from "@/lib/search/serialize-result-meta";
import { emitExportSearchIndex } from "./emit-export-search-index";
import {
  assertPhase1ExportSearchHandoffFromOutDir,
  formatPhase1StaticHandoffSearchChecksFromOutDirFailure,
  PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS,
  runPhase1StaticHandoffSearchChecks,
  runPhase1StaticHandoffSearchChecksFromOutDir,
} from "./run-phase-1-static-handoff-search-checks";

describe("PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS", () => {
  test("covers GQA, attention, and KV cache manual-gate queries", () => {
    expect(
      PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS.map((search) => search.query),
    ).toEqual(["GQA", "attention", "KV cache"]);
  });
});

describe("runPhase1StaticHandoffSearchChecks", () => {
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
  });

  test("passes Phase 1 assertions against docsSearchApi export payload", async () => {
    const payload = (await docsSearchApi.export()) as {
      type: "advanced";
      [key: string]: unknown;
    };

    const failures = await runPhase1StaticHandoffSearchChecks(
      payload,
      metaByUrl,
    );
    expect(failures).toEqual([]);
  });

  test("GQA ranks grouped-query attention first on static handoff path", async () => {
    const payload = (await docsSearchApi.export()) as {
      type: "advanced";
      [key: string]: unknown;
    };

    const failures = await runPhase1StaticHandoffSearchChecks(
      payload,
      metaByUrl,
      {
        searches: PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "GQA",
        ),
      },
    );
    expect(failures).toEqual([]);
  });

  test("attention includes attention module and grouped-query attention", async () => {
    const payload = (await docsSearchApi.export()) as {
      type: "advanced";
      [key: string]: unknown;
    };

    const failures = await runPhase1StaticHandoffSearchChecks(
      payload,
      metaByUrl,
      {
        searches: PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "attention",
        ),
      },
    );
    expect(failures).toEqual([]);
  });

  test("KV cache includes grouped-query attention", async () => {
    const payload = (await docsSearchApi.export()) as {
      type: "advanced";
      [key: string]: unknown;
    };

    const failures = await runPhase1StaticHandoffSearchChecks(
      payload,
      metaByUrl,
      {
        searches: PHASE_1_STATIC_HANDOFF_SEARCH_ASSERTIONS.filter(
          (search) => search.query === "KV cache",
        ),
      },
    );
    expect(failures).toEqual([]);
  });

  test("returns structured failures when an assertion does not pass", async () => {
    const payload = (await docsSearchApi.export()) as {
      type: "advanced";
      [key: string]: unknown;
    };

    const failures = await runPhase1StaticHandoffSearchChecks(
      payload,
      metaByUrl,
      {
        searches: [
          {
            query: "GQA",
            label: "static handoff /api/search?query=GQA",
            assertResults: () => "expected grouped-query attention first",
          },
        ],
      },
    );
    expect(failures).toEqual([
      {
        query: "GQA",
        label: "static handoff /api/search?query=GQA",
        reason: "expected grouped-query attention first",
      },
    ]);
  });
});

describe("runPhase1StaticHandoffSearchChecksFromOutDir", () => {
  let metaByUrl: ReturnType<typeof searchResultMetaMapToRecord>;

  beforeAll(async () => {
    metaByUrl = searchResultMetaMapToRecord(await loadSearchResultMetaMap());
  });

  test("passes for an emitted export bootstrap artifact", async () => {
    const dir = mkdtempSync(join(tmpdir(), "static-handoff-search-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const emitResult = await emitExportSearchIndex({ outDir: "out", cwd: dir });
    expect(emitResult.ok).toBe(true);

    const result = await runPhase1StaticHandoffSearchChecksFromOutDir(
      "out",
      metaByUrl,
      { cwd: dir },
    );
    expect(result.ok).toBe(true);

    rmSync(dir, { recursive: true, force: true });
  });

  test("fails when bootstrap payload is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "static-handoff-missing-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const result = await runPhase1StaticHandoffSearchChecksFromOutDir(
      "out",
      metaByUrl,
      { cwd: dir },
    );
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing export search bootstrap");
    }

    rmSync(dir, { recursive: true, force: true });
  });
});

describe("formatPhase1StaticHandoffSearchChecksFromOutDirFailure", () => {
  test("formats artifact failures with a concrete reason", () => {
    expect(
      formatPhase1StaticHandoffSearchChecksFromOutDirFailure({
        ok: false,
        reason: "Missing export search bootstrap at out/api/search",
      }),
    ).toBe("Missing export search bootstrap at out/api/search");
  });

  test("formats query ranking failures with query labels", () => {
    expect(
      formatPhase1StaticHandoffSearchChecksFromOutDirFailure({
        ok: false,
        failures: [
          {
            query: "GQA",
            label: "GQA ranks grouped-query attention first",
            reason: "expected grouped-query attention first",
          },
        ],
      }),
    ).toContain("GQA ranks grouped-query attention first");
    expect(
      formatPhase1StaticHandoffSearchChecksFromOutDirFailure({
        ok: false,
        failures: [
          {
            query: "GQA",
            label: "GQA ranks grouped-query attention first",
            reason: "expected grouped-query attention first",
          },
        ],
      }),
    ).toContain("expected grouped-query attention first");
  });
});

describe("assertPhase1ExportSearchHandoffFromOutDir", () => {
  test("passes for an emitted export bootstrap artifact", async () => {
    const dir = mkdtempSync(join(tmpdir(), "static-handoff-assert-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    const emitResult = await emitExportSearchIndex({ outDir: "out", cwd: dir });
    expect(emitResult.ok).toBe(true);

    await assertPhase1ExportSearchHandoffFromOutDir("out", { cwd: dir });

    rmSync(dir, { recursive: true, force: true });
  });

  test("throws when bootstrap payload is missing", async () => {
    const dir = mkdtempSync(join(tmpdir(), "static-handoff-assert-missing-"));
    mkdirSync(join(dir, "out"), { recursive: true });
    writeFileSync(join(dir, "out", "index.html"), "<html>ok</html>", "utf8");

    await expect(
      assertPhase1ExportSearchHandoffFromOutDir("out", { cwd: dir }),
    ).rejects.toThrow("Missing export search bootstrap");

    rmSync(dir, { recursive: true, force: true });
  });
});
