import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import {
  citationRecordSchema,
  moduleRecordSchema,
  tagRecordSchema,
} from "./schemas";

const registryRoot = join(import.meta.dir, "../../content/registry");

async function readRegistryJson<T>(
  relativePath: string,
  schema: { safeParse: (value: unknown) => { success: boolean; data?: T } },
): Promise<T> {
  const raw = await readFile(join(registryRoot, relativePath), "utf8");
  const parsed = schema.safeParse(JSON.parse(raw));
  expect(parsed.success).toBe(true);
  return parsed.data as T;
}

describe("Phase 1 baseline registry records", () => {
  test("grouped-query-attention module JSON passes moduleRecordSchema", async () => {
    const module = await readRegistryJson(
      "modules/grouped-query-attention.json",
      moduleRecordSchema,
    );

    expect(module.id).toBe("module.grouped-query-attention");
    expect(module.kind).toBe("module");
    expect(module.status).toBe("published");
    expect(module.moduleType).toBe("attention");
    expect(module.tags).toContain("attention");
    expect(module.citationIds).toContain("citation.gqa-paper");
    expect(module.optimizes.length).toBeGreaterThan(0);
    expect(module.practicalBenefits.length).toBeGreaterThan(0);
  });

  test("attention tag JSON passes tagRecordSchema", async () => {
    const tag = await readRegistryJson("tags/attention.json", tagRecordSchema);

    expect(tag.id).toBe("tag.attention");
    expect(tag.kind).toBe("tag");
    expect(tag.category).toBe("module-type");
    expect(tag.aliases.length).toBeGreaterThan(0);
  });

  test("gqa-paper citation JSON passes citationRecordSchema", async () => {
    const citation = await readRegistryJson(
      "citations/gqa-paper.json",
      citationRecordSchema,
    );

    expect(citation.id).toBe("citation.gqa-paper");
    expect(citation.kind).toBe("citation");
    expect(citation.status).toBe("published");
    expect(citation.authors.length).toBeGreaterThan(0);
    expect(citation.title.length).toBeGreaterThan(0);
    expect(citation.url).toMatch(/^https:\/\//);
    expect(citation.mla.length).toBeGreaterThan(0);
  });
});
