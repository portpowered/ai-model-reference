import { describe, expect, test } from "bun:test";
import { loadRegistry } from "@/lib/content/registry";
import type { ModuleRecord } from "@/lib/content/schemas";

function expectLocalAttentionRecord(
  record: ModuleRecord | undefined,
): ModuleRecord {
  if (!record) {
    throw new Error("expected module.local-attention in registry");
  }

  return record;
}

describe("local-attention registry record", () => {
  test("publishes local attention as an attention-family module with canonical discovery metadata", async () => {
    const indexes = await loadRegistry();
    const record = indexes.byId.get("module.local-attention") as
      | ModuleRecord
      | undefined;
    const localAttention = expectLocalAttentionRecord(record);

    expect(localAttention.slug).toBe("local-attention");
    expect(localAttention.kind).toBe("module");
    expect(localAttention.status).toBe("published");
    expect(localAttention.defaultTitleKey).toBe("title");
    expect(localAttention.defaultSummaryKey).toBe("description");
    expect(localAttention.moduleType).toBe("attention");
    expect(localAttention.moduleFamily).toBe("attention");
    expect(localAttention.conceptType).toBe("attention-variant");
    expect(localAttention.variantGroup).toBe("attention-locality");
    expect(localAttention.tags).toEqual(["attention", "context-window"]);
    expect(localAttention.aliases).toEqual([
      "local attention",
      "Local attention",
      "windowed attention",
      "windowed local attention",
      "neighborhood attention",
    ]);
    expect(localAttention.relatedIds).toEqual([
      "module.attention",
      "module.sliding-window-attention",
      "module.sparse-attention",
      "concept.why-long-context-is-hard",
      "concept.context-window",
    ]);
    expect(localAttention.citationIds).toEqual(["citation.longformer"]);
    expect(localAttention.improvesOnIds).toEqual(["module.attention"]);
  });
});
