import { describe, expect, test } from "bun:test";
import {
  createTableRegistrySourceEntries,
  renderGeneratedTableRegistryModule,
} from "@/lib/content/table-registry-generation";

describe("table-registry-generation", () => {
  test("sorts table source files deterministically before rendering", () => {
    const entries = createTableRegistrySourceEntries([
      "zeta-comparison.json",
      "alpha-comparison.json",
      "mid-comparison.json",
    ]);

    expect(entries.map((entry) => entry.fileName)).toEqual([
      "alpha-comparison.json",
      "mid-comparison.json",
      "zeta-comparison.json",
    ]);
  });

  test("renders imports and payload entries for every table record file", () => {
    const output = renderGeneratedTableRegistryModule(
      createTableRegistrySourceEntries(["fresh-table.json"]),
    );

    expect(output).toContain(
      'import freshTableTableRecord from "@/content/registry/tables/fresh-table.json";',
    );
    expect(output).toContain('"fresh-table.json"');
    expect(output).toContain("freshTableTableRecord");
  });
});
