import { describe, expect, test } from "bun:test";
import { cp, mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getProjectRoot } from "@/lib/content/content-paths";
import {
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_API_SEARCH_PROBES,
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_EXPORT_ROUTES,
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PAGE_SEARCH_QUERIES,
  CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES,
  CRITICAL_DOCS_SMOKE_RULES,
  deriveCriticalDocsSmokePages,
  loadCriticalDocsSmokePages,
  matchCriticalDocsSmokeRule,
  toCriticalDocsSmokeLocalRef,
} from "@/lib/content/critical-docs-smoke";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";

async function createCriticalDocsSmokeFixtureRoot(): Promise<string> {
  const tempRoot = join(
    import.meta.dir,
    "__critical-docs-smoke-fixtures__",
    crypto.randomUUID(),
  );
  await mkdir(join(tempRoot, "src", "content"), { recursive: true });
  await cp(
    join(getProjectRoot(), "src", "content", "registry", "tags"),
    join(tempRoot, "src", "content", "registry", "tags"),
    { recursive: true },
  );
  return tempRoot;
}

async function writeFixturePage(input: {
  docsRoot: string;
  section: string;
  slug: string;
  frontmatter: string;
  messages: Record<string, unknown>;
}): Promise<void> {
  const pageDir = join(input.docsRoot, input.section, input.slug);
  await mkdir(join(pageDir, "messages"), { recursive: true });
  await writeFile(join(pageDir, "page.mdx"), `${input.frontmatter}\n`);
  await writeFile(
    join(pageDir, "messages", "en.json"),
    `${JSON.stringify(input.messages, null, 2)}\n`,
  );
}

async function writeAttentionClassificationFixtures(
  registryRoot: string,
): Promise<void> {
  await mkdir(join(registryRoot, "classifications"), { recursive: true });
  await writeFile(
    join(registryRoot, "classifications", "module.json"),
    `${JSON.stringify(
      {
        id: "classification.module",
        slug: "module",
        kind: "classification",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        classificationType: "domain",
        classifiesKinds: ["module"],
      },
      null,
      2,
    )}\n`,
  );
  await writeFile(
    join(registryRoot, "classifications", "attention-mechanisms.json"),
    `${JSON.stringify(
      {
        id: "classification.module.attention",
        slug: "attention-mechanisms",
        kind: "classification",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: ["attention family"],
        tags: [],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-20T00:00:00.000Z",
        updatedAt: "2026-06-20T00:00:00.000Z",
        classificationType: "family",
        classifiesKinds: ["module"],
        parentClassificationId: "classification.module",
        legacyIds: ["classification.attention-mechanisms"],
      },
      null,
      2,
    )}\n`,
  );
}

describe("critical docs smoke contract", () => {
  test("documents the supported metadata-backed discovery rules", () => {
    expect(CRITICAL_DOCS_SMOKE_RULES).toEqual([
      {
        id: "attention-module",
        pageKind: "module",
        requiredTag: "attention",
      },
      {
        id: "token-to-probability-chain-glossary",
        pageKind: "glossary",
        requiredTag: "token-to-probability-chain",
      },
    ]);
  });

  test("matches supported module and glossary rules while excluding unsupported kinds and tags", () => {
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "module",
        tags: ["attention"],
      })?.id,
    ).toBe("attention-module");
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "glossary",
        tags: ["token-to-probability-chain", "foundations"],
      })?.id,
    ).toBe("token-to-probability-chain-glossary");
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "glossary",
        tags: ["attention"],
      }),
    ).toBeNull();
    expect(
      matchCriticalDocsSmokeRule({
        pageKind: "model",
        tags: ["attention"],
      }),
    ).toBeNull();
  });

  test("autodiscovers representative critical canonical pages from published metadata", async () => {
    const pages = await loadCriticalDocsSmokePages();
    const urls = pages.map((page) => page.url);
    const byUrl = new Map(pages.map((page) => [page.url, page]));

    expect(urls).toContain("/docs/modules/grouped-query-attention");
    expect(urls).toContain("/docs/modules/multi-head-attention");
    expect(urls).toContain("/docs/glossary/vector");
    expect(urls).toContain("/docs/glossary/hidden-size");
    expect(urls).not.toContain("/docs/training/dpo");
    expect(urls).not.toContain("/docs/models/gpt-3");

    expect(
      byUrl.get("/docs/modules/grouped-query-attention")?.criticalRuleId,
    ).toBe("attention-module");
    expect(byUrl.get("/docs/glossary/vector")?.criticalRuleId).toBe(
      "token-to-probability-chain-glossary",
    );
  });

  test("includes supported canonical pages automatically from fixture metadata without manual smoke inventories", async () => {
    const projectRoot = await createCriticalDocsSmokeFixtureRoot();
    const docsRoot = join(projectRoot, "src", "content", "docs");
    const registryRoot = join(projectRoot, "src", "content", "registry");

    try {
      await mkdir(join(registryRoot, "modules"), { recursive: true });
      await mkdir(join(registryRoot, "concepts"), { recursive: true });
      await writeAttentionClassificationFixtures(registryRoot);

      await writeFixturePage({
        docsRoot,
        section: "modules",
        slug: "fixture-attention-variant",
        frontmatter: `---
kind: "module"
registryId: "module.fixture-attention-variant"
messageNamespace: "local"
assetNamespace: "local"
tags:
  - "attention"
status: "published"
updatedAt: "2026-06-20"
---`,
        messages: {
          title: "Fixture Attention Variant",
          description: "Fixture attention module description.",
        },
      });
      await writeFile(
        join(registryRoot, "modules", "fixture-attention-variant.json"),
        `${JSON.stringify(
          {
            id: "module.fixture-attention-variant",
            slug: "fixture-attention-variant",
            kind: "module",
            defaultTitleKey: "title",
            defaultSummaryKey: "description",
            aliases: [],
            tags: ["attention"],
            relatedIds: [],
            citationIds: [],
            status: "published",
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:00:00.000Z",
            primaryClassificationId: "classification.module.attention",
            moduleType: "attention",
            optimizes: [],
            exampleModelIds: [],
            improvesOnIds: [],
            tradeoffIds: [],
            usedByModelIds: [],
            introducedByPaperIds: [],
            mathLevel: "light",
          },
          null,
          2,
        )}\n`,
      );

      const pages = await loadCriticalDocsSmokePages("en", {
        projectRoot,
      });
      expect(
        pages.some(
          (page) => page.url === "/docs/modules/fixture-attention-variant",
        ),
      ).toBe(true);
      expect(
        pages.find(
          (page) => page.url === "/docs/modules/fixture-attention-variant",
        )?.criticalRuleId,
      ).toBe("attention-module");
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  test("excludes canonical pages that miss the supported critical metadata contract", async () => {
    const projectRoot = await createCriticalDocsSmokeFixtureRoot();
    const docsRoot = join(projectRoot, "src", "content", "docs");
    const registryRoot = join(projectRoot, "src", "content", "registry");

    try {
      await mkdir(join(registryRoot, "modules"), { recursive: true });
      await writeAttentionClassificationFixtures(registryRoot);
      await mkdir(join(registryRoot, "concepts"), { recursive: true });

      await writeFixturePage({
        docsRoot,
        section: "modules",
        slug: "fixture-no-attention-tag",
        frontmatter: `---
kind: "module"
registryId: "module.fixture-no-attention-tag"
messageNamespace: "local"
assetNamespace: "local"
tags:
  - "systems"
status: "published"
updatedAt: "2026-06-20"
---`,
        messages: {
          title: "Fixture No Attention Tag",
          description: "Fixture module missing attention eligibility.",
        },
      });
      await writeFixturePage({
        docsRoot,
        section: "glossary",
        slug: "fixture-token-chain-mismatch",
        frontmatter: `---
kind: "glossary"
registryId: "concept.fixture-token-chain-mismatch"
messageNamespace: "local"
assetNamespace: "local"
tags:
  - "attention"
status: "published"
updatedAt: "2026-06-20"
---`,
        messages: {
          title: "Fixture Token Chain Mismatch",
          description: "Glossary fixture with the wrong discovery tag.",
        },
      });
      await writeFile(
        join(registryRoot, "modules", "fixture-no-attention-tag.json"),
        `${JSON.stringify(
          {
            id: "module.fixture-no-attention-tag",
            slug: "fixture-no-attention-tag",
            kind: "module",
            defaultTitleKey: "title",
            defaultSummaryKey: "description",
            aliases: [],
            tags: ["systems"],
            relatedIds: [],
            citationIds: [],
            status: "published",
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:00:00.000Z",
            primaryClassificationId: "classification.module.attention",
            moduleType: "attention",
            optimizes: [],
            exampleModelIds: [],
            improvesOnIds: [],
            tradeoffIds: [],
            usedByModelIds: [],
            introducedByPaperIds: [],
            mathLevel: "none",
          },
          null,
          2,
        )}\n`,
      );
      await writeFile(
        join(registryRoot, "concepts", "fixture-token-chain-mismatch.json"),
        `${JSON.stringify(
          {
            id: "concept.fixture-token-chain-mismatch",
            slug: "fixture-token-chain-mismatch",
            kind: "concept",
            defaultTitleKey: "title",
            defaultSummaryKey: "description",
            aliases: [],
            tags: ["attention"],
            relatedIds: [],
            citationIds: [],
            status: "published",
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:00:00.000Z",
            conceptType: "general",
            prerequisiteIds: [],
            explainsIds: [],
          },
          null,
          2,
        )}\n`,
      );

      const pages = await loadCriticalDocsSmokePages("en", {
        projectRoot,
      });
      expect(pages).toEqual([]);
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });

  test("documents representative export and search probes as a shared projection of the discovery contract", async () => {
    const pages = await loadCriticalDocsSmokePages();
    const pageByUrl = new Map(pages.map((page) => [page.url, page]));

    expect(CRITICAL_DOCS_SMOKE_REPRESENTATIVE_EXPORT_ROUTES).toEqual([
      "/docs/modules/grouped-query-attention",
      "/docs/modules/attention",
      "/docs/glossary/vector",
    ]);
    expect(CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PAGE_SEARCH_QUERIES).toEqual([
      "GQA",
      "attention",
      "KV cache",
    ]);
    expect(
      CRITICAL_DOCS_SMOKE_REPRESENTATIVE_API_SEARCH_PROBES.map(
        (probe) => probe.searchQuery,
      ),
    ).toEqual(["GQA", "attention", "vector", "hidden size", "KV cache"]);

    for (const probe of CRITICAL_DOCS_SMOKE_REPRESENTATIVE_PROBES) {
      const page = pageByUrl.get(probe.docsUrl);
      expect(page, probe.id).toBeDefined();
      expect(page?.criticalRuleId, probe.id).toBe(probe.criticalRuleId);
    }
  });

  test("projects discovered critical pages into stable local docs refs", () => {
    expect(
      toCriticalDocsSmokeLocalRef({
        docsSlug: "modules/grouped-query-attention",
      } as Awaited<ReturnType<typeof loadCriticalDocsSmokePages>>[number]),
    ).toEqual({
      section: "modules",
      slug: "grouped-query-attention",
      routeSlug: ["modules", "grouped-query-attention"],
    });
    expect(() =>
      toCriticalDocsSmokeLocalRef({
        docsSlug: "modules/grouped-query-attention/extra",
      } as Awaited<ReturnType<typeof loadCriticalDocsSmokePages>>[number]),
    ).toThrow(
      "Critical docs smoke page must use a two-segment docsSlug, got modules/grouped-query-attention/extra",
    );
  });

  test("derives fixture discovery tags from the same frontmatter-plus-registry contract used in production", async () => {
    const projectRoot = await createCriticalDocsSmokeFixtureRoot();
    const docsRoot = join(projectRoot, "src", "content", "docs");
    const registryRoot = join(projectRoot, "src", "content", "registry");

    try {
      await mkdir(join(registryRoot, "modules"), { recursive: true });
      await writeAttentionClassificationFixtures(registryRoot);

      await writeFixturePage({
        docsRoot,
        section: "modules",
        slug: "fixture-registry-tag-only",
        frontmatter: `---
kind: "module"
registryId: "module.fixture-registry-tag-only"
messageNamespace: "local"
assetNamespace: "local"
tags:
status: "published"
updatedAt: "2026-06-20"
---`,
        messages: {
          title: "Fixture Registry Tag Only",
          description: "Registry tag should drive inclusion here.",
        },
      });
      await writeFile(
        join(registryRoot, "modules", "fixture-registry-tag-only.json"),
        `${JSON.stringify(
          {
            id: "module.fixture-registry-tag-only",
            slug: "fixture-registry-tag-only",
            kind: "module",
            defaultTitleKey: "title",
            defaultSummaryKey: "description",
            aliases: [],
            tags: ["attention"],
            relatedIds: [],
            citationIds: [],
            status: "published",
            createdAt: "2026-06-20T00:00:00.000Z",
            updatedAt: "2026-06-20T00:00:00.000Z",
            primaryClassificationId: "classification.module.attention",
            moduleType: "attention",
            optimizes: [],
            exampleModelIds: [],
            improvesOnIds: [],
            tradeoffIds: [],
            usedByModelIds: [],
            introducedByPaperIds: [],
            mathLevel: "light",
          },
          null,
          2,
        )}\n`,
      );

      const pages = await loadPublishedDocsPages("en", docsRoot);
      const registry = await loadRegistry({ registryRoot });
      const discovered = deriveCriticalDocsSmokePages(pages, registry);

      expect(discovered).toHaveLength(1);
      expect(discovered[0]?.discoveryTags).toContain("attention");
      expect(discovered[0]?.url).toBe(
        "/docs/modules/fixture-registry-tag-only",
      );
    } finally {
      await rm(projectRoot, { recursive: true, force: true });
    }
  });
});
