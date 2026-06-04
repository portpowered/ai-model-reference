import { describe, expect, test } from "bun:test";
import { access, mkdir, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "./content-paths";
import {
  formatScaffoldPlan,
  parseScaffoldDocPageArgv,
  readScaffoldedPageRegistryId,
  scaffoldDocPage,
} from "./scaffold-doc-page";

async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

describe("parseScaffoldDocPageArgv", () => {
  test("parses required and optional flags", () => {
    const input = parseScaffoldDocPageArgv([
      "--kind",
      "glossary",
      "--slug",
      "kv-cache",
      "--title",
      "KV Cache",
      "--concept-type",
      "inference",
      "--tags",
      "attention,kv-cache",
      "--related-ids",
      "concept.token,module.grouped-query-attention",
      "--citation-ids",
      "citation.gqa-paper",
      "--aliases",
      "key-value cache,KV cache",
      "--dry-run",
    ]);

    expect(input).toEqual({
      kind: "glossary",
      slug: "kv-cache",
      title: "KV Cache",
      conceptType: "inference",
      tags: ["attention", "kv-cache"],
      relatedIds: ["concept.token", "module.grouped-query-attention"],
      citationIds: ["citation.gqa-paper"],
      aliases: ["key-value cache", "KV cache"],
      dryRun: true,
    });
  });
});

describe("scaffoldDocPage", () => {
  test("dry-run prints planned glossary bundle paths without writing files", async () => {
    const projectRoot = getProjectRoot();
    const slug = `dry-run-${crypto.randomUUID()}`;
    const result = await scaffoldDocPage({
      kind: "glossary",
      slug,
      title: "Dry Run Term",
      conceptType: "general",
      tags: ["attention"],
      dryRun: true,
      projectRoot,
    });

    expect(result.registryId).toBe(`concept.${slug}`);
    expect(result.writtenFiles).toEqual([]);
    expect(result.plannedFiles.map((file) => file.path)).toEqual([
      join(projectRoot, "src/content/registry/concepts", `${slug}.json`),
      join(projectRoot, "src/content/docs/glossary", slug, "page.mdx"),
      join(
        projectRoot,
        "src/content/docs/glossary",
        slug,
        "messages",
        "en.json",
      ),
      join(projectRoot, "src/content/docs/glossary", slug, "assets.json"),
    ]);

    for (const file of result.plannedFiles) {
      expect(await pathExists(file.path)).toBe(false);
    }

    expect(formatScaffoldPlan(result)).toContain(result.registryId);
  });

  test("writes glossary registry and colocated bundle from templates", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const contentRoot = join(tempRoot, "src", "content");
    const { cp } = await import("node:fs/promises");
    await mkdir(join(tempRoot, "docs", "templates"), { recursive: true });
    await cp(
      join(getProjectRoot(), "docs", "templates"),
      join(tempRoot, "docs", "templates"),
      {
        recursive: true,
      },
    );
    await mkdir(join(contentRoot, "registry", "concepts"), { recursive: true });
    await mkdir(join(contentRoot, "docs", "glossary"), { recursive: true });

    const slug = "scaffold-glossary-term";
    const result = await scaffoldDocPage({
      kind: "glossary",
      slug,
      title: "Scaffold Glossary Term",
      conceptType: "architecture",
      tags: ["attention"],
      aliases: ["scaffold alias"],
      relatedIds: ["concept.token"],
      citationIds: [],
      projectRoot: tempRoot,
    });

    expect(result.registryId).toBe(`concept.${slug}`);
    expect(result.writtenFiles).toHaveLength(4);

    const registryRaw = await readFile(
      join(contentRoot, "registry", "concepts", `${slug}.json`),
      "utf8",
    );
    const registry = JSON.parse(registryRaw) as {
      id: string;
      slug: string;
      tags: string[];
      relatedIds: string[];
      conceptType: string;
      status: string;
    };
    expect(registry.id).toBe(`concept.${slug}`);
    expect(registry.slug).toBe(slug);
    expect(registry.tags).toEqual(["attention"]);
    expect(registry.relatedIds).toEqual(["concept.token"]);
    expect(registry.conceptType).toBe("architecture");
    expect(registry.status).toBe("draft");

    const pageRegistryId = await readScaffoldedPageRegistryId(
      join(contentRoot, "docs", "glossary", slug, "page.mdx"),
    );
    expect(pageRegistryId).toBe(`concept.${slug}`);

    const pageRaw = await readFile(
      join(contentRoot, "docs", "glossary", slug, "page.mdx"),
      "utf8",
    );
    expect(pageRaw).toContain('kind: "glossary"');
    expect(pageRaw).toContain('registryId: "concept.scaffold-glossary-term"');
    expect(pageRaw).not.toContain("concept.example-glossary");

    const messages = JSON.parse(
      await readFile(
        join(contentRoot, "docs", "glossary", slug, "messages", "en.json"),
        "utf8",
      ),
    ) as { title: string; sections: { whatItIs: { title: string } } };
    expect(messages.title).toBe("Scaffold Glossary Term");
    expect(messages.sections.whatItIs.title).toBe("What It Is");

    const assets = JSON.parse(
      await readFile(
        join(contentRoot, "docs", "glossary", slug, "assets.json"),
        "utf8",
      ),
    ) as { conceptMap: { type: string; graphId: string } };
    expect(assets.conceptMap.type).toBe("graph");
    expect(assets.conceptMap.graphId).toBe(
      "graph.scaffold-glossary-term-concept-map",
    );

    await rm(tempRoot, { recursive: true, force: true });
  });

  test("writes concept bundle under docs/concepts", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const contentRoot = join(tempRoot, "src", "content");
    const { cp } = await import("node:fs/promises");
    await mkdir(join(tempRoot, "docs", "templates"), { recursive: true });
    await cp(
      join(getProjectRoot(), "docs", "templates"),
      join(tempRoot, "docs", "templates"),
      {
        recursive: true,
      },
    );
    await mkdir(join(contentRoot, "registry", "concepts"), { recursive: true });
    await mkdir(join(contentRoot, "docs", "concepts"), { recursive: true });

    const slug = "scaffold-concept-term";
    await scaffoldDocPage({
      kind: "concept",
      slug,
      title: "Scaffold Concept Term",
      conceptType: "math",
      tags: ["attention"],
      projectRoot: tempRoot,
    });

    expect(
      await pathExists(join(contentRoot, "docs", "concepts", slug, "page.mdx")),
    ).toBe(true);
    expect(
      await pathExists(
        join(contentRoot, "registry", "concepts", `${slug}.json`),
      ),
    ).toBe(true);

    const pageRaw = await readFile(
      join(contentRoot, "docs", "concepts", slug, "page.mdx"),
      "utf8",
    );
    expect(pageRaw).toContain('kind: "concept"');
    expect(pageRaw).not.toContain("concept.example-concept");

    await rm(tempRoot, { recursive: true, force: true });
  });
});
