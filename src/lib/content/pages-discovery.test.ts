import { afterEach, describe, expect, test } from "bun:test";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { getDocsPageDir } from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";

async function writePublishedPage(
  docsRoot: string,
  section: "glossary" | "concepts" | "modules",
  slug: string,
  title: string,
  description: string,
): Promise<void> {
  const pageDir = getDocsPageDir(section, slug, docsRoot);
  const kind =
    section === "modules"
      ? "module"
      : section === "concepts"
        ? "concept"
        : "glossary";
  const registryPrefix = section === "modules" ? "module" : "concept";
  await mkdir(join(pageDir, "messages"), { recursive: true });
  await writeFile(
    join(pageDir, "page.mdx"),
    `---
kind: ${kind}
registryId: ${registryPrefix}.${slug}
messageNamespace: local
assetNamespace: local
status: published
tags:
  - attention
updatedAt: "2026-06-19"
---

# ${title}
`,
  );
  await writeFile(
    join(pageDir, "messages", "en.json"),
    JSON.stringify({ title, description }),
  );
}

describe("published docs page discovery", () => {
  let tempRoot: string | undefined;

  afterEach(async () => {
    if (tempRoot) {
      await rm(tempRoot, { recursive: true, force: true });
      tempRoot = undefined;
    }
  });

  test("discovers a newly added published page from the owned docs tree without a shared path manifest edit", async () => {
    tempRoot = await mkdtemp(join(tmpdir(), "published-docs-discovery-"));
    const docsRoot = join(tempRoot, "docs");

    await writePublishedPage(
      docsRoot,
      "modules",
      "attention",
      "Attention",
      "Baseline module page used to prove family discovery.",
    );
    await writePublishedPage(
      docsRoot,
      "modules",
      "fresh-attention-variant",
      "Fresh Attention Variant",
      "New additive page discovered by the shared scanner.",
    );

    const pages = await loadPublishedDocsPages("en", docsRoot);
    const discoveredSlugs = pages.map((page) => page.docsSlug).sort();

    expect(discoveredSlugs).toEqual([
      "modules/attention",
      "modules/fresh-attention-variant",
    ]);
    expect(
      pages.find((page) => page.docsSlug === "modules/fresh-attention-variant"),
    ).toMatchObject({
      docsSlug: "modules/fresh-attention-variant",
      url: "/docs/modules/fresh-attention-variant",
      messages: {
        title: "Fresh Attention Variant",
        description: "New additive page discovered by the shared scanner.",
      },
    });
  });
});
