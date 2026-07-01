import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { buildPublishedDocsIndex } from "./published-docs-registry-source";
import { loadRegistry } from "./registry";
import {
  scanPublishedDocsPagesForValidation,
  validateDerivedPublishedPageBundles,
  validateOrdinaryPublishedPageBundle,
  validatePublishedPageRegistryAlignment,
  validatePublishedPageRouteMetadata,
} from "./validate-derived-published-page-bundles";

const validConceptRecord = {
  id: "concept.derived-validation-sample",
  slug: "derived-validation-sample",
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
  sidebarGrouping: {},
};

async function writePublishedConceptPage(options: {
  docsRoot: string;
  slug: string;
  registryId: string;
  kind?: string;
  status?: string;
  messages?: Record<string, unknown>;
  frontmatterOverrides?: Record<string, unknown>;
}) {
  const pageDir = join(options.docsRoot, "concepts", options.slug);
  await mkdir(join(pageDir, "messages"), { recursive: true });
  await writeFile(
    join(pageDir, "page.mdx"),
    `---
kind: ${JSON.stringify(options.kind ?? "concept")}
registryId: ${JSON.stringify(options.registryId)}
messageNamespace: "local"
assetNamespace: "local"
tags:
status: ${JSON.stringify(options.status ?? "published")}
updatedAt: "2026-06-02"
${
  options.frontmatterOverrides
    ? `${Object.entries(options.frontmatterOverrides)
        .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
        .join("\n")}\n`
    : ""
}---

# <T k="title" />
`,
  );
  await writeFile(
    join(pageDir, "messages", "en.json"),
    JSON.stringify(
      options.messages ?? {
        title: "Derived Validation Sample",
        description: "Sample page for derived validation coverage.",
      },
    ),
  );
  await writeFile(join(pageDir, "assets.json"), JSON.stringify({}));
}

describe("validateDerivedPublishedPageBundles", () => {
  test("scanner-backed validation passes for a valid published concept page bundle", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "derived-validation-sample";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify(validConceptRecord),
    );
    await writePublishedConceptPage({
      docsRoot,
      slug,
      registryId: validConceptRecord.id,
    });

    try {
      const errors = await validateDerivedPublishedPageBundles({
        registryRoot,
        docsRoot,
      });
      expect(errors).toEqual([]);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports missing default-locale messages with route and docs slug context", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "missing-messages-page";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.missing-messages-page",
        slug,
      }),
    );
    await writePublishedConceptPage({
      docsRoot,
      slug,
      registryId: "concept.missing-messages-page",
    });
    await rm(join(docsRoot, "concepts", slug, "messages"), {
      recursive: true,
      force: true,
    });

    try {
      const errors = await validateDerivedPublishedPageBundles({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "missing-default-locale-messages" &&
            error.message.includes("/docs/concepts/missing-messages-page") &&
            error.message.includes(
              'docs slug "concepts/missing-messages-page"',
            ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports unresolved registryId with route and docs slug context", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "missing-registry-page";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await writePublishedConceptPage({
      docsRoot,
      slug,
      registryId: "concept.missing-registry-page",
    });

    try {
      const errors = await validateDerivedPublishedPageBundles({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "unresolved-registry-id" &&
            error.message.includes("concept.missing-registry-page") &&
            error.message.includes("/docs/concepts/missing-registry-page"),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports glossary-to-concept page-kind bridge mismatches", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "glossary-kind-bridge";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.glossary-kind-bridge",
        slug,
      }),
    );
    await writePublishedConceptPage({
      docsRoot,
      slug,
      registryId: "concept.glossary-kind-bridge",
      kind: "glossary",
    });
    await rm(join(docsRoot, "concepts", slug), {
      recursive: true,
      force: true,
    });
    const glossaryDir = join(docsRoot, "glossary", slug);
    await mkdir(join(glossaryDir, "messages"), { recursive: true });
    await writeFile(
      join(glossaryDir, "page.mdx"),
      `---
kind: glossary
registryId: "concept.glossary-kind-bridge"
messageNamespace: "local"
assetNamespace: "local"
tags:
status: published
updatedAt: "2026-06-02"
---

# <T k="title" />
`,
    );
    await writeFile(
      join(glossaryDir, "messages", "en.json"),
      JSON.stringify({
        title: "Glossary Kind Bridge",
        description: "Glossary page backed by a concept registry record.",
      }),
    );
    await writeFile(join(glossaryDir, "assets.json"), JSON.stringify({}));

    try {
      const errors = await validateDerivedPublishedPageBundles({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "kind-mismatch" &&
            error.message.includes("glossary") &&
            error.message.includes("concept"),
        ),
      ).toBe(false);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("reports unsupported page-kind and registry-kind mismatches", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "kind-mismatch-page";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.kind-mismatch-page",
        slug,
      }),
    );
    await writePublishedConceptPage({
      docsRoot,
      slug,
      registryId: "concept.kind-mismatch-page",
      kind: "module",
    });

    try {
      const errors = await validateDerivedPublishedPageBundles({
        registryRoot,
        docsRoot,
      });
      expect(
        errors.some(
          (error) =>
            error.code === "kind-mismatch" &&
            error.message.includes('page kind "module"') &&
            error.message.includes('registry record kind "concept"'),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("excludes draft pages from scanner-backed derived validation", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const docsRoot = join(tempRoot, "docs");

    await writePublishedConceptPage({
      docsRoot,
      slug: "draft-only-page",
      registryId: "concept.draft-only-page",
      status: "draft",
    });

    try {
      const { pages, errors } = scanPublishedDocsPagesForValidation(docsRoot);
      expect(pages).toHaveLength(0);
      expect(errors).toHaveLength(0);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });

  test("validateOrdinaryPublishedPageBundle checks route metadata and registry alignment", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    const docsRoot = join(tempRoot, "docs");
    const slug = "route-metadata-page";

    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await writeFile(
      join(registryRoot, "concepts", `${slug}.json`),
      JSON.stringify({
        ...validConceptRecord,
        id: "concept.route-metadata-page",
        slug,
      }),
    );
    await writePublishedConceptPage({
      docsRoot,
      slug,
      registryId: "concept.route-metadata-page",
    });

    try {
      const { pages } = scanPublishedDocsPagesForValidation(docsRoot);
      const page = pages[0];
      const entry = buildPublishedDocsIndex(pages).entries[0];
      const indexes = await loadRegistry({ registryRoot });

      expect(validatePublishedPageRouteMetadata(page, entry)).toEqual([]);
      expect(validatePublishedPageRegistryAlignment(page, indexes)).toEqual([]);
      expect(validateOrdinaryPublishedPageBundle(page, entry, indexes)).toEqual(
        [],
      );
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});
