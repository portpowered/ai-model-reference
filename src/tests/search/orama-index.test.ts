import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { existsSync, readFileSync, rmSync } from "node:fs";
import path from "node:path";
import { search } from "@orama/orama";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import {
  createOramaDatabase,
  exportOramaIndexSnapshot,
  type OramaSnapshotDocument,
} from "@/lib/search/orama-index";

const ATTENTION_MODULE_URL = "/docs/modules/attention";
const MULTI_HEAD_ATTENTION_URL = "/docs/modules/multi-head-attention";
const MULTI_QUERY_ATTENTION_URL = "/docs/modules/multi-query-attention";
const SAMPLE_URL = "/docs/modules/grouped-query-attention";
const MLA_MODULE_URL = "/docs/modules/multi-head-latent-attention";
const LINEAR_ATTENTION_MODULE_URL = "/docs/modules/linear-attention";
const SLIDING_WINDOW_ATTENTION_MODULE_URL =
  "/docs/modules/sliding-window-attention";
const SPARSE_ATTENTION_MODULE_URL = "/docs/modules/sparse-attention";
const TOKEN_GLOSSARY_URL = "/docs/glossary/token";
const TRANSFORMER_ARCHITECTURE_URL = "/docs/concepts/transformer-architecture";
const PAGE_SPEC_WORKFLOW_SAMPLE_URL =
  "/docs/concepts/page-spec-workflow-sample";
const FEED_FORWARD_NETWORK_URL = "/docs/glossary/feed-forward-network";
const MIXTURE_OF_EXPERTS_URL = "/docs/glossary/mixture-of-experts";
const LAYER_NORM_URL = "/docs/glossary/layer-norm";
const RMSNORM_URL = "/docs/glossary/rmsnorm";
const NORMALIZATION_URL = "/docs/glossary/normalization";
const RESIDUAL_CONNECTION_URL = "/docs/glossary/residual-connection";
const POSITIONAL_ENCODINGS_URL = "/docs/concepts/positional-encodings";
const ROPE_URL = "/docs/glossary/rope";
const ALIBI_URL = "/docs/glossary/alibi";
const CONTEXT_WINDOW_URL = "/docs/glossary/context-window";
const CONTEXT_EXTENSION_URL = "/docs/concepts/context-extension";
const WHY_LONG_CONTEXT_IS_HARD_URL = "/docs/concepts/why-long-context-is-hard";
const STRUCTURAL_TAXONOMY_URLS = [
  "/docs/glossary/model",
  "/docs/glossary/architecture",
  "/docs/glossary/module",
  "/docs/glossary/component",
] as const;
const ROLE_MODALITY_TAXONOMY_URLS = [
  "/docs/glossary/modality",
  "/docs/glossary/foundation-model",
  "/docs/glossary/generative-model",
  "/docs/glossary/discriminative-model",
  "/docs/glossary/representation",
] as const;
const REPRESENTATION_LATENT_URLS = [
  "/docs/glossary/patch",
  "/docs/glossary/latent",
  "/docs/glossary/latent-space",
] as const;
const ENCODER_DECODER_URLS = [
  "/docs/glossary/encoder",
  "/docs/glossary/decoder",
  "/docs/glossary/encoder-decoder",
] as const;
const GENERATION_PARADIGM_URLS = [
  "/docs/glossary/autoregressive-generation",
  "/docs/glossary/denoising-generation",
  "/docs/glossary/conditioning",
] as const;
const TRAINING_BEHAVIOR_URLS = [
  "/docs/glossary/alignment",
  "/docs/glossary/model-capacity",
  "/docs/glossary/overfitting",
  "/docs/glossary/generalization",
] as const;
const EVALUATION_SCALING_URLS = [
  "/docs/glossary/perplexity",
  "/docs/glossary/scaling-law",
  "/docs/glossary/emergent-behavior",
] as const;
const MODEL_FAMILY_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
] as const;
const CHAIN_GLOSSARY_URLS = [
  "/docs/glossary/embedding",
  "/docs/glossary/vector",
  "/docs/glossary/hidden-size",
  "/docs/glossary/tensor",
  "/docs/glossary/logit",
  "/docs/glossary/softmax",
  "/docs/glossary/entropy",
  "/docs/glossary/temperature",
  "/docs/glossary/parameter",
  "/docs/glossary/activation",
  "/docs/glossary/computational-graph",
  "/docs/glossary/gradient",
  "/docs/glossary/backpropagation",
  "/docs/glossary/loss-function",
  "/docs/glossary/optimizer-state",
] as const;
const PUBLISHED_SEARCH_INDEX_URLS = [
  ATTENTION_MODULE_URL,
  MULTI_HEAD_ATTENTION_URL,
  MULTI_QUERY_ATTENTION_URL,
  SAMPLE_URL,
  MLA_MODULE_URL,
  LINEAR_ATTENTION_MODULE_URL,
  SLIDING_WINDOW_ATTENTION_MODULE_URL,
  SPARSE_ATTENTION_MODULE_URL,
  TOKEN_GLOSSARY_URL,
  TRANSFORMER_ARCHITECTURE_URL,
  PAGE_SPEC_WORKFLOW_SAMPLE_URL,
  FEED_FORWARD_NETWORK_URL,
  MIXTURE_OF_EXPERTS_URL,
  LAYER_NORM_URL,
  RMSNORM_URL,
  NORMALIZATION_URL,
  RESIDUAL_CONNECTION_URL,
  POSITIONAL_ENCODINGS_URL,
  ROPE_URL,
  ALIBI_URL,
  CONTEXT_WINDOW_URL,
  CONTEXT_EXTENSION_URL,
  WHY_LONG_CONTEXT_IS_HARD_URL,
  ...STRUCTURAL_TAXONOMY_URLS,
  ...ROLE_MODALITY_TAXONOMY_URLS,
  ...REPRESENTATION_LATENT_URLS,
  ...ENCODER_DECODER_URLS,
  ...GENERATION_PARADIGM_URLS,
  ...TRAINING_BEHAVIOR_URLS,
  ...EVALUATION_SCALING_URLS,
  ...MODEL_FAMILY_URLS,
  ...CHAIN_GLOSSARY_URLS,
] as const;
const GENERATED_INDEX_PATH = path.join(
  process.cwd(),
  "src/generated/search-index.json",
);

function findSnapshotDocument(
  documents: OramaSnapshotDocument[],
  url: string,
): OramaSnapshotDocument | undefined {
  return documents.find((document) => document.url === url);
}

describe("exportOramaIndexSnapshot", () => {
  test("produces version 1 with Orama payload and Phase 1 document URLs", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const snapshot = await exportOramaIndexSnapshot(documents);

    expect(snapshot.version).toBe(1);
    expect(snapshot.language).toBe("english");
    expect(snapshot.orama).toBeDefined();
    expect(snapshot.documents.length).toBe(documents.length);
    const urls = snapshot.documents.map((document) => document.url);
    expect(urls).toContain(SAMPLE_URL);
    expect(urls).toContain(TOKEN_GLOSSARY_URL);
  });

  test("preserves title, description, kind, tags, and url per indexed document", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const sourceDocuments = buildSearchDocuments(pages, registry);
    const snapshot = await exportOramaIndexSnapshot(sourceDocuments);

    for (const source of sourceDocuments) {
      const exported = findSnapshotDocument(snapshot.documents, source.url);
      expect(exported).toBeDefined();
      expect(exported?.title).toBe(source.title);
      expect(exported?.description).toBe(source.description);
      expect(exported?.kind).toBe(source.kind);
      expect(exported?.tags).toEqual(source.tags);
      expect(exported?.url).toBe(source.url);
    }

    const gqa = findSnapshotDocument(snapshot.documents, SAMPLE_URL);
    expect(gqa?.title).toBe("Grouped-Query Attention");
    expect(gqa?.description).toContain("KV cache");
    expect(gqa?.kind).toBe("module");
    expect(gqa?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );

    const token = findSnapshotDocument(snapshot.documents, TOKEN_GLOSSARY_URL);
    expect(token?.title).toBe("Token");
    expect(token?.kind).toBe("glossary");
    expect(token?.tags).toEqual(expect.arrayContaining(["attention"]));
  });

  test("Orama database records preserve searchable kind and tag fields", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const db = await createOramaDatabase(documents);
    const { hits } = await search(db, { term: "GQA" });

    expect(hits.length).toBeGreaterThan(0);
    const gqaHit = hits.find(
      (hit) => (hit.document as { url: string }).url === SAMPLE_URL,
    );
    expect(gqaHit).toBeDefined();
    expect((gqaHit?.document as { kind: string }).kind).toBe("module");
    expect((gqaHit?.document as { tags: string }).tags).toContain("attention");
  });

  test.each([
    { query: "MHA", url: MULTI_HEAD_ATTENTION_URL },
    { query: "multi-head attention", url: MULTI_HEAD_ATTENTION_URL },
    { query: "MQA", url: MULTI_QUERY_ATTENTION_URL },
    { query: "multi-query attention", url: MULTI_QUERY_ATTENTION_URL },
  ] as const)("Orama database records rank %s for the %s alias query", async ({
    query,
    url,
  }) => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const db = await createOramaDatabase(documents);
    const { hits } = await search(db, { term: query });

    expect(hits.length).toBeGreaterThan(0);
    expect((hits[0]?.document as { url: string }).url).toBe(url);
  });
});

describe("build-search-index script", () => {
  test("writes generated snapshot for all published docs pages", () => {
    if (existsSync(GENERATED_INDEX_PATH)) {
      rmSync(GENERATED_INDEX_PATH);
    }

    const result = spawnSync("bun", ["./scripts/build-search-index.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(existsSync(GENERATED_INDEX_PATH)).toBe(true);

    const snapshot = JSON.parse(
      readFileSync(GENERATED_INDEX_PATH, "utf8"),
    ) as Awaited<ReturnType<typeof exportOramaIndexSnapshot>>;

    expect(snapshot.version).toBe(1);
    expect(snapshot.orama).toBeDefined();
    expect(snapshot.documents.length).toBe(PUBLISHED_SEARCH_INDEX_URLS.length);
    const urls = snapshot.documents.map((document) => document.url).sort();
    expect(urls).toEqual([...PUBLISHED_SEARCH_INDEX_URLS].sort());

    const gqa = findSnapshotDocument(snapshot.documents, SAMPLE_URL);
    expect(gqa?.title).toBe("Grouped-Query Attention");
    expect(gqa?.kind).toBe("module");
    expect(gqa?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );

    rmSync(GENERATED_INDEX_PATH, { force: true });
  });
});
