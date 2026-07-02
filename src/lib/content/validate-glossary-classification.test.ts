import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  scanPublishedDocsPagesForValidation,
  validateDerivedPublishedPageBundles,
} from "./validate-derived-published-page-bundles";
import { validatePublishedGlossaryClassification } from "./validate-glossary-classification";
import { validateRegistryContent } from "./validate-registry";

const validTagRecord = {
  id: "tag.attention",
  slug: "attention",
  kind: "tag",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  category: "module-type",
  landingPage: "generated-tag-page",
};

async function writePublishedGlossaryPage(options: {
  docsRoot: string;
  slug: string;
  registryId: string;
}) {
  const pageDir = join(options.docsRoot, "glossary", options.slug);
  await mkdir(join(pageDir, "messages"), { recursive: true });
  await writeFile(
    join(pageDir, "page.mdx"),
    `---
kind: "glossary"
registryId: ${JSON.stringify(options.registryId)}
messageNamespace: "local"
assetNamespace: "local"
tags:
  - "attention"
status: "published"
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
  );
  await writeFile(
    join(pageDir, "messages", "en.json"),
    JSON.stringify({
      title: "Glossary Classification Sample",
      description: "Sample glossary page for classification validation.",
    }),
  );
  await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));
}

describe("validatePublishedGlossaryClassification", () => {
  test("fails when a published glossary page lacks primary classification and explicit fallback", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "unclassified-glossary-sample";
    const registryId = "concept.unclassified-glossary-sample";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        id: registryId,
        slug,
        kind: "concept",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: ["attention"],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        conceptType: "general",
        prerequisiteIds: [],
        explainsIds: [],
      }),
    );
    await writePublishedGlossaryPage({ docsRoot, slug, registryId });

    try {
      const errors = await validateDerivedPublishedPageBundles({
        registryRoot,
        docsRoot,
      });

      expect(
        errors.some(
          (error) =>
            error.code === "missing-glossary-classification" &&
            error.message.includes(registryId) &&
            error.message.includes(`/docs/glossary/${slug}`),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("allows explicit sidebarGrouping.glossary fallback without primary classification", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "editorial-fallback-glossary";
    const registryId = "concept.editorial-fallback-glossary";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        id: registryId,
        slug,
        kind: "concept",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: ["attention"],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        conceptType: "general",
        prerequisiteIds: [],
        explainsIds: [],
        sidebarGrouping: { glossary: "math-and-training" },
      }),
    );
    await writePublishedGlossaryPage({ docsRoot, slug, registryId });

    try {
      const { pages } = scanPublishedDocsPagesForValidation(docsRoot);
      const page = pages.find((entry) => entry.docsSlug === `glossary/${slug}`);
      expect(page).toBeDefined();
      if (!page) {
        return;
      }

      const indexes = await import("./registry").then((module) =>
        module.loadRegistry({ registryRoot }),
      );
      const errors = validatePublishedGlossaryClassification(page, indexes);
      expect(errors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validateRegistryContent surfaces missing glossary classification through validate-data", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "validate-data-glossary-classification";
    const registryId = "concept.validate-data-glossary-classification";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        id: registryId,
        slug,
        kind: "concept",
        defaultTitleKey: "title",
        defaultSummaryKey: "description",
        aliases: [],
        tags: ["attention"],
        relatedIds: [],
        citationIds: [],
        status: "published",
        createdAt: "2026-06-01T00:00:00.000Z",
        updatedAt: "2026-06-02T00:00:00.000Z",
        conceptType: "general",
        prerequisiteIds: [],
        explainsIds: [],
      }),
    );
    await writePublishedGlossaryPage({ docsRoot, slug, registryId });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
        phase1PageDirectories: [],
      });

      expect(
        errors.some(
          (error) =>
            error.code === "missing-glossary-classification" &&
            error.message.includes(registryId),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
