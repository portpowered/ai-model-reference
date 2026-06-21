import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { DerivedRelatedDocs } from "@/features/docs/components/DerivedRelatedDocs";
import { RelatedDocs } from "@/features/docs/components/RelatedDocs";
import { loadLocalDocsPage } from "@/lib/content/local-docs-page";
import { renderModuleDocsShell } from "@/lib/content/module-shell-render";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  deriveSameVariantGroupPeers,
  SAME_VARIANT_GROUP,
} from "@/lib/content/related-docs";
import type { ModuleRecord } from "@/lib/content/schemas";

/** Attention modules with a published docs page and variantGroup after batch 017. */
const ATTENTION_VARIANT_MODULE_IDS = [
  "module.causal-attention",
  "module.bidirectional-attention",
  "module.multi-head-attention",
  "module.multi-query-attention",
  "module.grouped-query-attention",
  "module.multi-head-latent-attention",
  "module.local-attention",
  "module.sparse-attention",
  "module.block-sparse-attention",
  "module.sliding-window-attention",
  "module.linear-attention",
] as const;

const HEAD_SHARING_REGISTRY_IDS = [
  "module.multi-head-attention",
  "module.multi-query-attention",
  "module.grouped-query-attention",
  "module.multi-head-latent-attention",
] as const;

const HEAD_SHARING_MODULE_URLS = [
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/grouped-query-attention",
  "/docs/modules/multi-head-latent-attention",
] as const;

const SOLO_VARIANT_GROUP_MODULES = [
  {
    registryId: "module.linear-attention",
    variantGroup: "subquadratic-attention",
  },
] as const;

const SPARSE_PATTERN_REGISTRY_IDS = [
  "module.sparse-attention",
  "module.block-sparse-attention",
] as const;

const ATTENTION_LOCALITY_REGISTRY_IDS = [
  "module.local-attention",
  "module.sliding-window-attention",
] as const;

function expectModuleRecord(registryId: string): ModuleRecord {
  const record = getRegistryRecordById(registryId);
  if (record?.kind !== "module") {
    throw new Error(`expected module record for ${registryId}`);
  }
  return record;
}

function listPublishedModuleRecords(): ModuleRecord[] {
  return listRelatedRegistryRecords().filter(
    (record): record is ModuleRecord =>
      record.kind === "module" && PUBLISHED_DOCS_REGISTRY_IDS.has(record.id),
  );
}

describe("Phase 2/3 reconciliation attention-variant related docs (US-011)", () => {
  test("published attention variant modules declare variantGroup in registry", async () => {
    const indexes = await loadRegistry();

    for (const id of ATTENTION_VARIANT_MODULE_IDS) {
      const record = indexes.byId.get(id);
      expect(record?.kind).toBe("module");
      expect((record as ModuleRecord | undefined)?.variantGroup).toBeDefined();
      expect(PUBLISHED_DOCS_REGISTRY_IDS.has(id)).toBe(true);
    }
  });

  test("attention-head-sharing peers cross-link MHA, MQA, GQA, and MLA", () => {
    const modules = listPublishedModuleRecords();

    for (const sourceId of HEAD_SHARING_REGISTRY_IDS) {
      const source = expectModuleRecord(sourceId);
      const peers = deriveSameVariantGroupPeers(
        source,
        modules,
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      const expectedPeerIds = HEAD_SHARING_REGISTRY_IDS.filter(
        (id) => id !== sourceId,
      );
      expect(peers.map((peer) => peer.registryId).sort()).toEqual(
        [...expectedPeerIds].sort(),
      );
      expect(
        peers.every(
          (peer) => peer.reasonLabel === "Compatibility: same variant group",
        ),
      ).toBe(true);
      expect(
        peers.every((peer) => peer.href?.startsWith("/docs/modules/")),
      ).toBe(true);
      expect(peers.every((peer) => !peer.isPlanned)).toBe(true);
    }
  });

  test("attention-locality peers cross-link local attention and sliding-window attention", () => {
    const modules = listPublishedModuleRecords();

    for (const sourceId of ATTENTION_LOCALITY_REGISTRY_IDS) {
      const source = expectModuleRecord(sourceId);
      const peers = deriveSameVariantGroupPeers(
        source,
        modules,
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      const expectedPeerIds = ATTENTION_LOCALITY_REGISTRY_IDS.filter(
        (id) => id !== sourceId,
      );
      expect(peers.map((peer) => peer.registryId).sort()).toEqual(
        [...expectedPeerIds].sort(),
      );
      expect(
        peers.every(
          (peer) => peer.reasonLabel === "Compatibility: same variant group",
        ),
      ).toBe(true);
      expect(
        peers.every((peer) => peer.href?.startsWith("/docs/modules/")),
      ).toBe(true);
      expect(peers.every((peer) => !peer.isPlanned)).toBe(true);
    }
  });

  test("solo variant groups omit same-variant-group peers until siblings publish", () => {
    const modules = listPublishedModuleRecords();

    for (const { registryId } of SOLO_VARIANT_GROUP_MODULES) {
      const source = expectModuleRecord(registryId);
      const peers = deriveSameVariantGroupPeers(
        source,
        modules,
        PUBLISHED_DOCS_REGISTRY_IDS,
      );
      expect(peers).toEqual([]);
    }
  });

  test("sparse-pattern variants cross-link sparse and block-sparse attention once both publish", () => {
    const modules = listPublishedModuleRecords();

    for (const sourceId of SPARSE_PATTERN_REGISTRY_IDS) {
      const source = expectModuleRecord(sourceId);
      const peers = deriveSameVariantGroupPeers(
        source,
        modules,
        PUBLISHED_DOCS_REGISTRY_IDS,
      );

      const expectedPeerIds = SPARSE_PATTERN_REGISTRY_IDS.filter(
        (id) => id !== sourceId,
      );
      expect(peers.map((peer) => peer.registryId)).toEqual(expectedPeerIds);
      expect(
        peers.every(
          (peer) => peer.reasonLabel === "Compatibility: same variant group",
        ),
      ).toBe(true);
      expect(
        peers.every((peer) => peer.href?.startsWith("/docs/modules/")),
      ).toBe(true);
      expect(peers.every((peer) => !peer.isPlanned)).toBe(true);
    }
  });

  test("DerivedRelatedDocs upgrades legacy same-variant-group requests to ontology classification siblings", () => {
    for (const registryId of [
      "module.multi-head-attention",
      "module.multi-query-attention",
      "module.grouped-query-attention",
    ] as const) {
      const html = renderToStaticMarkup(
        <DerivedRelatedDocs
          registryId={registryId}
          groups={[SAME_VARIANT_GROUP]}
        />,
      );

      expect(html).toContain('data-testid="derived-related-docs"');
      expect(html).toContain('data-related-group="classification-siblings"');
      expect(html).not.toContain('data-related-group="same-variant-group"');
      expect(html).toContain("Same classification");

      for (const peerId of HEAD_SHARING_REGISTRY_IDS) {
        if (peerId === registryId) {
          continue;
        }
        const peer = expectModuleRecord(peerId);
        expect(html).toContain(`href="/docs/modules/${peer.slug}"`);
      }
    }
  });

  test("RelatedDocs composes curated links with ontology classification siblings on GQA", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.grouped-query-attention" />,
    );

    expect(html).not.toContain('data-related-group="same-variant-group"');
    expect(html).toContain('data-related-group="classification-siblings"');
    expect(html).toContain('href="/docs/modules/multi-head-attention"');
    expect(html).toContain('href="/docs/modules/multi-query-attention"');
    expect(html).toContain('href="/docs/modules/multi-head-latent-attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain("curated");
    expect(html).toContain("Same classification: attention mechanisms");
  });

  test("RelatedDocs keeps the causal neighbor visible while switching bidirectional attention to ontology sibling labels", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.bidirectional-attention" />,
    );

    expect(html).not.toContain('data-related-group="same-variant-group"');
    expect(html).toContain('data-related-group="classification-siblings"');
    expect(html).toContain('href="/docs/modules/causal-attention"');
    expect(html).toContain("Same classification: attention mechanisms");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/attention"');
    expect(html).toContain('href="/docs/glossary/autoregressive-generation"');
    expect(html).toContain('href="/docs/glossary/encoder"');
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/glossary/encoder-decoder"');
  });

  test("RelatedDocs does not duplicate head-sharing module links between variant and curated groups on GQA", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.grouped-query-attention" />,
    );

    expect(
      html.match(/href="\/docs\/modules\/multi-head-attention"/g),
    ).toHaveLength(1);
    expect(
      html.match(/href="\/docs\/modules\/multi-query-attention"/g),
    ).toHaveLength(1);
    expect(
      html.match(/href="\/docs\/modules\/multi-head-latent-attention"/g),
    ).toHaveLength(1);
  });

  test("module pages render ontology classification sibling peer links in the related section", async () => {
    for (const url of HEAD_SHARING_MODULE_URLS) {
      const slug = url.replace("/docs/modules/", "");
      const loadedPage = await loadLocalDocsPage({ section: "modules", slug });
      const html = renderModuleDocsShell(loadedPage);

      expect(html).toContain('data-related-group="classification-siblings"');
      expect(html).not.toContain('data-related-group="same-variant-group"');
      expect(html).toContain("Same classification: attention mechanisms");

      for (const peerUrl of HEAD_SHARING_MODULE_URLS) {
        if (peerUrl === url) {
          continue;
        }
        expect(html).toContain(`href="${peerUrl}"`);
      }
    }
  });

  test("expanded variants with solo groups keep curated links without empty variant sections", () => {
    for (const { registryId } of SOLO_VARIANT_GROUP_MODULES) {
      const html = renderToStaticMarkup(
        <RelatedDocs registryId={registryId} />,
      );

      expect(html).not.toContain('data-related-group="same-variant-group"');
      expect(html).toContain('data-testid="curated-related-docs"');
      expect(html).toContain("curated");
    }
  });

  test("sparse attention related docs render ontology classification siblings alongside curated links", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.sparse-attention" />,
    );

    expect(html).not.toContain('data-related-group="same-variant-group"');
    expect(html).toContain('data-related-group="classification-siblings"');
    expect(html).toContain('href="/docs/modules/block-sparse-attention"');
    expect(html).toContain("Same classification: attention mechanisms");
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain("curated");
  });

  test("sliding-window attention keeps local-attention visible as an ontology sibling without duplicating curated links", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="module.sliding-window-attention" />,
    );

    expect(html).not.toContain('data-related-group="same-variant-group"');
    expect(html).toContain('data-related-group="classification-siblings"');
    expect(html).toContain('href="/docs/modules/local-attention"');
    expect(html).toContain('data-testid="curated-related-docs"');
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/glossary/kv-cache"');
    expect(html.match(/href="\/docs\/modules\/local-attention"/g)).toHaveLength(
      1,
    );
  });

  test("foundation-model related docs do not group temperature just because both records share the legacy general conceptType", () => {
    const html = renderToStaticMarkup(
      <RelatedDocs registryId="concept.foundation-model" />,
    );

    expect(html).not.toContain('href="/docs/glossary/temperature"');
    expect(html).toContain('href="/docs/glossary/generative-model"');
    expect(html).toContain('href="/docs/glossary/discriminative-model"');
    expect(html).not.toContain('data-related-group="same-concept-type"');
  });
});
