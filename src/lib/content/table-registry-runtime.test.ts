import { describe, expect, test } from "bun:test";
import { readdirSync, readFileSync } from "node:fs";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
import { parsePageAssetConfig } from "@/lib/content/assets";
import { MODULES_DOCS_ROOT } from "@/lib/content/content-paths";
import { generatedTableRegistrySourceFiles } from "@/lib/content/generated/table-registry.generated";
import type { TableRecord } from "@/lib/content/schemas";
import {
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";
import {
  getTableById,
  listTableRecords,
} from "@/lib/content/table-registry-runtime";

function listShippedModuleComparisonTableIds(): string[] {
  return readdirSync(MODULES_DOCS_ROOT, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort()
    .flatMap((slug) => {
      const assetsPath = join(MODULES_DOCS_ROOT, slug, "assets.json");
      const assets = parsePageAssetConfig(
        JSON.parse(readFileSync(assetsPath, "utf8")),
      );

      return Object.values(assets)
        .filter((asset) => asset.type === "table")
        .map((asset) => asset.tableId);
    });
}

function createTableRecord(id: string, subjectId: string): TableRecord {
  return {
    id,
    subjectId,
    columns: [
      {
        moduleId: subjectId,
        titleKey: `${id}.columns.primary`,
      },
    ],
    dimensions: [
      {
        id: "comparisonAxis",
        labelKey: `${id}.dimensions.primary`,
      },
    ],
    valueKeysByModuleId: {
      [subjectId]: {
        comparisonAxis: `${id}.values.primary`,
      },
    },
  };
}

describe("table-registry-runtime", () => {
  test("loads the GQA nearby-module comparison table by id", () => {
    const table = getTableById("table.grouped-query-attention-comparison");
    expect(table?.id).toBe("table.grouped-query-attention-comparison");

    const mhaTable = getTableById("table.multi-head-attention-comparison");
    expect(mhaTable?.id).toBe("table.multi-head-attention-comparison");
    expect(mhaTable?.subjectId).toBe("module.multi-head-attention");

    const mqaTable = getTableById("table.multi-query-attention-comparison");
    expect(mqaTable?.id).toBe("table.multi-query-attention-comparison");
    expect(mqaTable?.subjectId).toBe("module.multi-query-attention");
    expect(table?.columns.length).toBe(3);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.multi-head-attention"]?.kvHeadCount,
    ).toBe("tables.comparison.values.mha.kvHeadCount");
  });

  test("loads the MLA nearby-module comparison table by id", () => {
    const table = getTableById("table.multi-head-latent-attention-comparison");
    expect(table?.id).toBe("table.multi-head-latent-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.grouped-query-attention"]
        ?.cacheFootprint,
    ).toBe("tables.comparison.values.gqa.cacheFootprint");
  });

  test("loads the linear-attention nearby-module comparison table by id", () => {
    const table = getTableById("table.linear-attention-comparison");
    expect(table?.id).toBe("table.linear-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.linear-attention"]?.sequenceScaling,
    ).toBe("tables.comparison.values.linear.sequenceScaling");
  });

  test("loads the sliding-window-attention nearby-module comparison table by id", () => {
    const table = getTableById("table.sliding-window-attention-comparison");
    expect(table?.id).toBe("table.sliding-window-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.sliding-window-attention"]
        ?.attentionLocality,
    ).toBe("tables.comparison.values.window.attentionLocality");
  });

  test("loads the sparse-attention nearby-module comparison table by id", () => {
    const table = getTableById("table.sparse-attention-comparison");
    expect(table?.id).toBe("table.sparse-attention-comparison");
    expect(table?.columns.length).toBe(4);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.sparse-attention"]
        ?.attentionConnectivity,
    ).toBe("tables.comparison.values.sparse.attentionConnectivity");
  });

  test("loads the bidirectional-attention nearby-module comparison table by id", () => {
    const table = getTableById("table.bidirectional-attention-comparison");
    expect(table?.id).toBe("table.bidirectional-attention-comparison");
    expect(table?.subjectId).toBe("module.bidirectional-attention");
    expect(table?.columns.length).toBe(3);
    expect(table?.dimensions.length).toBe(3);
    expect(
      table?.valueKeysByModuleId["module.bidirectional-attention"]
        ?.visibleContext,
    ).toBe("tables.comparison.values.bidirectional.visibleContext");
  });

  test("lists bundled table records", () => {
    const tableIds = listTableRecords().map((record) => record.id);
    expect(tableIds.length).toBe(generatedTableRegistrySourceFiles.length);
    expect(tableIds).toContain("table.bpe-comparison");
    expect(tableIds).toContain("table.byte-level-tokenization-comparison");
    expect(tableIds).toContain("table.unigram-tokenizer-comparison");
    expect(
      getTableById("table.byte-level-tokenization-comparison")?.subjectId,
    ).toBe("module.byte-level-tokenization");
    );
    expect(getTableById("table.unigram-tokenizer-comparison")?.subjectId).toBe(
      "module.unigram-tokenizer",
    );
  });

  test("resolves every shipped module comparison table through the synchronous helpers", () => {
    const listedTableIds = new Set(
      listTableRecords().map((record) => record.id),
    );

    for (const tableId of listShippedModuleComparisonTableIds()) {
      expect(getTableById(tableId)?.id).toBe(tableId);
      expect(listedTableIds.has(tableId)).toBe(true);
    }
  });

  test("makes a newly added table json visible through the generated runtime helpers", async () => {
    const tempRoot = await mkdtemp(join(tmpdir(), "table-registry-runtime-"));
    const tablesDir = join(tempRoot, "tables");
    const generatedDir = join(tempRoot, "generated");
    const runtimePath = join(tempRoot, "table-registry-runtime.ts");
    const generatedModulePath = join(
      generatedDir,
      "table-registry.generated.ts",
    );
    const schemasModulePath = join(import.meta.dir, "schemas.ts");

    try {
      await mkdir(tablesDir, { recursive: true });
      await mkdir(generatedDir, { recursive: true });

      await writeFile(
        join(tablesDir, "baseline-comparison.json"),
        JSON.stringify(
          createTableRecord("table.baseline-comparison", "module.baseline"),
        ),
      );
      await writeFile(
        join(tablesDir, "fresh-comparison.json"),
        JSON.stringify(
          createTableRecord("table.fresh-comparison", "module.fresh"),
        ),
      );

      const generatedModuleSource = renderGeneratedTableRegistryModule(
        createTableRegistrySourceEntries(
          ["baseline-comparison.json", "fresh-comparison.json"],
          "../tables",
        ),
      );
      await writeFile(generatedModulePath, generatedModuleSource);

      await writeFile(
        runtimePath,
        `import { generatedTableRegistryPayloads } from "./generated/table-registry.generated.ts";
import { tableRecordSchema } from ${JSON.stringify(schemasModulePath)};

const tableRecords = generatedTableRegistryPayloads.map((record) =>
  tableRecordSchema.parse(record),
);

const tablesById = new Map(tableRecords.map((record) => [record.id, record]));

export function getTableById(tableId) {
  return tablesById.get(tableId);
}

export function listTableRecords() {
  return [...tableRecords];
}
`,
      );

      const runtimeModuleUrl = pathToFileURL(runtimePath);
      runtimeModuleUrl.searchParams.set("ts", Date.now().toString());
      const runtimeModule = (await import(runtimeModuleUrl.href)) as {
        getTableById: (tableId: string) => TableRecord | undefined;
        listTableRecords: () => TableRecord[];
      };

      expect(
        runtimeModule.getTableById("table.fresh-comparison")?.subjectId,
      ).toBe("module.fresh");
      expect(
        runtimeModule.listTableRecords().map((record) => record.id),
      ).toEqual(["table.baseline-comparison", "table.fresh-comparison"]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
