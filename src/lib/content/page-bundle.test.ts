import { describe, expect, test } from "bun:test";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { loadPageAssets } from "./assets";
import { groupedQueryAttentionPageDir, loadPageMessages } from "./messages";
import { pageFrontmatterSchema } from "./schemas";

function parseYamlFrontmatterBlock(block: string): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const lines = block.split("\n");
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const keyMatch = line.match(/^(\w+):\s*(.*)$/);
    if (!keyMatch) {
      i += 1;
      continue;
    }
    const [, key, rest] = keyMatch;
    if (rest.length === 0) {
      const items: string[] = [];
      i += 1;
      while (i < lines.length && /^\s+-\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\s+-\s+/, "").replace(/^"|"$/g, ""));
        i += 1;
      }
      result[key] = items;
      continue;
    }
    result[key] = rest.replace(/^"|"$/g, "");
    i += 1;
  }
  return result;
}

describe("grouped-query-attention page bundle", () => {
  test("page.mdx frontmatter matches module baseline contract", async () => {
    const pagePath = join(groupedQueryAttentionPageDir, "page.mdx");
    const raw = await readFile(pagePath, "utf8");
    const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
    expect(match?.[1]).toBeDefined();
    if (!match?.[1]) {
      throw new Error("missing frontmatter block");
    }

    const frontmatter = parseYamlFrontmatterBlock(match[1]);

    const parsed = pageFrontmatterSchema.safeParse(frontmatter);
    expect(parsed.success).toBe(true);
    if (!parsed.success) {
      throw new Error(parsed.error.message);
    }

    expect(parsed.data.registryId).toBe("module.grouped-query-attention");
    expect(parsed.data.kind).toBe("module");
    expect(parsed.data.messageNamespace).toBe("local");
    expect(parsed.data.assetNamespace).toBe("local");
    expect(parsed.data.tags).toContain("attention");
    expect(parsed.data.status).toBe("published");
  });

  test("message and asset loaders succeed for the baseline page directory", async () => {
    const messages = await loadPageMessages(groupedQueryAttentionPageDir, "en");
    const assets = await loadPageAssets(groupedQueryAttentionPageDir);

    expect(messages.title.length).toBeGreaterThan(0);
    expect(messages.description.length).toBeGreaterThan(0);
    expect(messages.problemStatement?.length).toBeGreaterThan(0);
    expect(messages.coreIdea?.length).toBeGreaterThan(0);
    expect(messages.sections?.whatItIs?.body?.length).toBeGreaterThan(0);
    expect(messages.sections?.howItWorks?.body?.length).toBeGreaterThan(0);

    expect(assets.computeFlow?.type).toBe("graph");
    expect(assets.computeSchema?.type).toBe("graph");
    expect(assets.comparisonTable?.type).toBe("table");
  });
});
