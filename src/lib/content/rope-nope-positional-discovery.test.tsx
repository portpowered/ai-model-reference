import { describe, expect, test } from "bun:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { ModuleMetadataCard } from "@/features/models/components/ModuleMetadataCard";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  getModuleById,
  getRegistryRecordById,
  listClassificationMembers,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { resolveModulesSidebarGroupWithSource } from "@/lib/content/sidebar-grouping";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { docsSearchApi } from "@/lib/search/search-server";

const ROPE_URL = "/docs/modules/rope";
const NOPE_URL = "/docs/modules/nope";
const POSITION_ENCODING_TAG_SLUG = "position-encoding";
const TOKENIZER_CLASSIFICATION_ID = "classification.module.tokenization";
const POSITIONAL_CLASSIFICATION_ID =
  "classification.module.positional-encoding";

function pageBaseUrl(url: string): string {
  return url.split("#")[0] ?? url;
}

describe("RoPE and NoPE positional-family discovery surfaces (tokenizers-003)", () => {
  test.each([
    "module.rope",
    "module.nope",
  ] as const)("registry classifies %s under the positional module family", (moduleId) => {
    const record = getModuleById(moduleId);
    expect(record?.status).toBe("published");
    expect(record?.primaryClassificationId).toBe(POSITIONAL_CLASSIFICATION_ID);
    expect(record?.moduleType).toBe("position-encoding");

    const tokenizerMembers = listClassificationMembers(
      TOKENIZER_CLASSIFICATION_ID,
    ).map((member) => member.record.id);
    const positionalMembers = listClassificationMembers(
      POSITIONAL_CLASSIFICATION_ID,
    ).map((member) => member.record.id);

    expect(positionalMembers).toContain(moduleId);
    expect(tokenizerMembers).not.toContain(moduleId);
  });

  test.each([
    ["module.rope", ROPE_URL],
    ["module.nope", NOPE_URL],
  ] as const)("sidebar grouping and metadata surfaces present %s as a positional module", (registryId, canonicalUrl) => {
    const record = getModuleById(registryId);
    if (!record) {
      throw new Error(`expected ${registryId} in registry runtime`);
    }

    expect(resolveModulesSidebarGroupWithSource(record)).toEqual({
      groupId: "positional-embeddings",
      source: "derived-taxonomy",
    });
    expect(PUBLISHED_DOCS_REGISTRY_IDS.has(registryId)).toBe(true);

    const metadataHtml = renderToStaticMarkup(
      <ModuleMetadataCard registryId={registryId} />,
    );
    expect(metadataHtml).toContain("Classification");
    expect(metadataHtml).toContain("Position Encoding Methods");
    expect(metadataHtml).not.toContain("Tokenization Methods");
    expect(metadataHtml).not.toContain("Also classified as");
    expect(metadataHtml).toContain(`data-registry-id="${registryId}"`);
    expect(canonicalUrl).toContain(record.slug);
  });

  test("curated related docs connect RoPE to the positional overview and nearby positional modules", () => {
    const source = getRegistryRecordById("module.rope");
    if (source?.kind !== "module") {
      throw new Error("expected module.rope in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.positional-encodings",
      "module.relative-position-bias",
      "module.alibi",
      "concept.context-extension",
      "module.ntk-aware-rope-scaling",
      "module.longrope",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/concepts/positional-encodings",
      "/docs/modules/relative-position-bias",
      "/docs/modules/alibi",
      "/docs/concepts/context-extension",
      "/docs/modules/ntk-aware-rope-scaling",
      "/docs/modules/longrope",
    ]);

    const relatedHtml = renderToStaticMarkup(
      <RelatedDocs registryId="module.rope" />,
    );
    expect(relatedHtml).toContain('data-testid="curated-related-docs"');
    expect(relatedHtml).toContain(
      'data-testid="classification-siblings-related-docs"',
    );
    expect(relatedHtml).toContain('href="/docs/concepts/positional-encodings"');
    expect(relatedHtml).toContain("positional encoding");
    expect(relatedHtml).toContain(
      'href="/docs/modules/ntk-aware-rope-scaling"',
    );
    expect(relatedHtml).toContain('href="/docs/modules/longrope"');
    expect(relatedHtml).toContain(
      "Same classification: position encoding methods",
    );
    expect(relatedHtml).not.toContain("Same classification: tokenization");
    expect(relatedHtml).not.toContain("Tokenizer overview");
  });

  test("curated related docs connect NoPE to the positional overview and nearby positional modules", () => {
    const source = getRegistryRecordById("module.nope");
    if (source?.kind !== "module") {
      throw new Error("expected module.nope in registry runtime");
    }

    const items = deriveCuratedRelatedItems(
      source,
      listRelatedRegistryRecords(),
      PUBLISHED_DOCS_REGISTRY_IDS,
    );

    expect(items.map((item) => item.registryId)).toEqual([
      "concept.positional-encodings",
      "module.absolute-positional-embeddings",
      "module.rope",
      "module.alibi",
    ]);
    expect(items.map((item) => item.href)).toEqual([
      "/docs/concepts/positional-encodings",
      "/docs/modules/absolute-positional-embeddings",
      "/docs/modules/rope",
      "/docs/modules/alibi",
    ]);

    const relatedHtml = renderToStaticMarkup(
      <RelatedDocs registryId="module.nope" />,
    );
    expect(relatedHtml).toContain('data-testid="curated-related-docs"');
    expect(relatedHtml).toContain(
      'data-testid="classification-siblings-related-docs"',
    );
    expect(relatedHtml).toContain('href="/docs/concepts/positional-encodings"');
    expect(relatedHtml).toContain('href="/docs/modules/rope"');
    expect(relatedHtml).toContain(
      'href="/docs/modules/absolute-positional-embeddings"',
    );
    expect(relatedHtml).toContain(
      "Same classification: position encoding methods",
    );
    expect(relatedHtml).not.toContain("Same classification: tokenization");
    expect(relatedHtml).not.toContain("Tokenizer overview");
  });

  test("position-encoding tag landing surfaces RoPE and NoPE as positional-family module entry points", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups(
      POSITION_ENCODING_TAG_SLUG,
      messages,
      "en",
    );
    const moduleGroup = groups.find((group) => group.kind === "module");
    const conceptGroup = groups.find((group) => group.kind === "concept");

    expect(moduleGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "module",
          slug: "rope",
          title: "RoPE",
          url: ROPE_URL,
        }),
        expect.objectContaining({
          kind: "module",
          slug: "nope",
          title: "NoPE",
          url: NOPE_URL,
        }),
      ]),
    );
    expect(conceptGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "concept",
          slug: "positional-encodings",
          url: "/docs/concepts/positional-encodings",
        }),
      ]),
    );

    const page = await TagLandingPage({
      params: Promise.resolve({ slug: POSITION_ENCODING_TAG_SLUG }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("RoPE");
    expect(html).toContain(`href="${ROPE_URL}"`);
    expect(html).toContain("NoPE");
    expect(html).toContain(`href="${NOPE_URL}"`);
    expect(html).toContain("Positional encodings");
    expect(html).toContain('href="/search?tag=position-encoding"');
    expect(html).not.toContain("Tokenizers overview");
    expect(html).not.toContain("Nothing has shipped");
  });

  test.each([
    ["RoPE", ROPE_URL, true],
    ["rotary position embedding", ROPE_URL, true],
    ["NoPE", NOPE_URL, true],
    ["positional embedding", ROPE_URL, false],
  ] as const)("search query %s surfaces the canonical positional-family page", async (query, expectedUrl, expectsTopHit) => {
    const results = await docsSearchApi.search(query);

    expect(results.length).toBeGreaterThan(0);
    if (expectsTopHit) {
      expect(pageBaseUrl(results[0]?.url ?? "")).toBe(expectedUrl);
      return;
    }

    expect(
      results.some((result) => pageBaseUrl(result.url ?? "") === ROPE_URL),
    ).toBe(true);
    expect(
      results.some((result) => pageBaseUrl(result.url ?? "") === NOPE_URL),
    ).toBe(true);
  });
});
