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
const FEED_FORWARD_NETWORK_URL = "/docs/modules/feed-forward-network";
const STANDARD_FFN_URL = "/docs/modules/standard-ffn";
const NORMALIZATION_URL = "/docs/glossary/normalization";
const LAYER_NORM_URL = "/docs/modules/layer-norm";
const BATCH_NORM_URL = "/docs/modules/batch-norm";
const GROUP_NORM_URL = "/docs/modules/group-norm";
const MIXTURE_OF_EXPERTS_URL = "/docs/modules/mixture-of-experts";
const ROUTING_SYSTEM_URL = "/docs/systems/routing";
const RELU_URL = "/docs/modules/relu";
const LEAKY_RELU_URL = "/docs/modules/leaky-relu";
const SILU_URL = "/docs/modules/silu";
const SWIGLU_URL = "/docs/modules/swiglu";
const RMSNORM_URL = "/docs/modules/rmsnorm";
const QK_NORM_URL = "/docs/modules/qk-norm";
const RESIDUAL_CONNECTION_URL = "/docs/glossary/residual-connection";
const SKIP_CONNECTION_URL = "/docs/glossary/skip-connection";
const POSITIONAL_ENCODINGS_URL = "/docs/concepts/positional-encodings";
const ABSOLUTE_POSITIONAL_EMBEDDINGS_URL =
  "/docs/modules/absolute-positional-embeddings";
const LEARNED_POSITIONAL_EMBEDDINGS_URL =
  "/docs/modules/learned-positional-embeddings";
const LONGROPE_URL = "/docs/modules/longrope";
const RELATIVE_POSITION_BIAS_URL = "/docs/modules/relative-position-bias";
const T5_RELATIVE_POSITION_BIAS_URL = "/docs/modules/t5-relative-position-bias";
const POSITIONAL_INTERPOLATION_URL = "/docs/modules/positional-interpolation";
const ROPE_URL = "/docs/modules/rope";
const ALIBI_URL = "/docs/modules/alibi";
const NOPE_URL = "/docs/modules/nope";
const NTK_AWARE_ROPE_SCALING_URL = "/docs/modules/ntk-aware-rope-scaling";
const SINUSOIDAL_POSITIONAL_EMBEDDINGS_URL =
  "/docs/modules/sinusoidal-positional-embeddings";
const SUPERHOT_ROPE_URL = "/docs/modules/superhot-rope";
const CONTEXT_WINDOW_URL = "/docs/glossary/context-window";
const KV_CACHE_URL = "/docs/glossary/kv-cache";
const PREFILL_URL = "/docs/glossary/prefill";
const DECODE_URL = "/docs/glossary/decode";
const PREFILL_DECODE_SPLIT_URL = "/docs/glossary/prefill-decode-split";
const SAMPLING_OVERVIEW_URL = "/docs/glossary/sampling-overview";
const GREEDY_DECODING_URL = "/docs/glossary/greedy-decoding";
const TOP_K_SAMPLING_URL = "/docs/glossary/top-k-sampling";
const TOP_P_SAMPLING_URL = "/docs/glossary/top-p-sampling";
const CONTEXT_EXTENSION_URL = "/docs/concepts/context-extension";
const WHY_LONG_CONTEXT_IS_HARD_URL = "/docs/concepts/why-long-context-is-hard";
const YARN_URL = "/docs/modules/yarn";
const QUANTIZATION_URL = "/docs/concepts/quantization";
const POST_TRAINING_QUANTIZATION_URL =
  "/docs/concepts/post-training-quantization";
const CALIBRATION_URL = "/docs/concepts/calibration";
const QUANTIZATION_AWARE_TRAINING_URL =
  "/docs/concepts/quantization-aware-training";
const DYNAMIC_QUANTIZATION_URL = "/docs/concepts/dynamic-quantization";
const WEIGHT_ONLY_QUANTIZATION_URL = "/docs/concepts/weight-only-quantization";
const ACTIVATION_QUANTIZATION_URL = "/docs/concepts/activation-quantization";
const KV_CACHE_QUANTIZATION_URL = "/docs/concepts/kv-cache-quantization";
const WHY_FOUR_BIT_MODELS_ARE_NOT_EXACTLY_FOUR_X_FASTER_URL =
  "/docs/concepts/why-4-bit-models-are-not-exactly-4x-faster";
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
  KV_CACHE_URL,
  PREFILL_URL,
  DECODE_URL,
  PREFILL_DECODE_SPLIT_URL,
  SAMPLING_OVERVIEW_URL,
  GREEDY_DECODING_URL,
  TOP_K_SAMPLING_URL,
  TOP_P_SAMPLING_URL,
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
  BATCH_NORM_URL,
  GROUP_NORM_URL,
  STANDARD_FFN_URL,
  MIXTURE_OF_EXPERTS_URL,
  RELU_URL,
  LEAKY_RELU_URL,
  SILU_URL,
  SWIGLU_URL,
  LAYER_NORM_URL,
  RMSNORM_URL,
  NORMALIZATION_URL,
  QK_NORM_URL,
  RESIDUAL_CONNECTION_URL,
  SKIP_CONNECTION_URL,
  POSITIONAL_ENCODINGS_URL,
  ABSOLUTE_POSITIONAL_EMBEDDINGS_URL,
  LEARNED_POSITIONAL_EMBEDDINGS_URL,
  LONGROPE_URL,
  RELATIVE_POSITION_BIAS_URL,
  T5_RELATIVE_POSITION_BIAS_URL,
  POSITIONAL_INTERPOLATION_URL,
  ROPE_URL,
  ALIBI_URL,
  NOPE_URL,
  NTK_AWARE_ROPE_SCALING_URL,
  SINUSOIDAL_POSITIONAL_EMBEDDINGS_URL,
  SUPERHOT_ROPE_URL,
  CONTEXT_WINDOW_URL,
  CONTEXT_EXTENSION_URL,
  WHY_LONG_CONTEXT_IS_HARD_URL,
  YARN_URL,
  QUANTIZATION_URL,
  POST_TRAINING_QUANTIZATION_URL,
  CALIBRATION_URL,
  QUANTIZATION_AWARE_TRAINING_URL,
  DYNAMIC_QUANTIZATION_URL,
  WEIGHT_ONLY_QUANTIZATION_URL,
  ACTIVATION_QUANTIZATION_URL,
  KV_CACHE_QUANTIZATION_URL,
  WHY_FOUR_BIT_MODELS_ARE_NOT_EXACTLY_FOUR_X_FASTER_URL,
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
const BUILD_SEARCH_INDEX_TEST_ENV: NodeJS.ProcessEnv = {
  PATH: process.env.PATH ?? "",
  HOME: process.env.HOME ?? "",
  TMPDIR: process.env.TMPDIR ?? "",
  USER: process.env.USER ?? "",
  SHELL: process.env.SHELL ?? "",
  TERM: process.env.TERM ?? "",
  NODE_ENV: process.env.NODE_ENV ?? "test",
};

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
    expect(gqa?.description).toContain("key-value cache");
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
    { query: "LongRoPE", url: LONGROPE_URL },
    { query: "positional interpolation", url: POSITIONAL_INTERPOLATION_URL },
    { query: "feed-forward network", url: FEED_FORWARD_NETWORK_URL },
    { query: "standard FFN", url: STANDARD_FFN_URL },
    { query: "normalization", url: NORMALIZATION_URL },
    { query: "layer norm", url: LAYER_NORM_URL },
    { query: "batch norm", url: BATCH_NORM_URL },
    { query: "group norm", url: GROUP_NORM_URL },
    { query: "RMSNorm", url: RMSNORM_URL },
    { query: "QK norm", url: QK_NORM_URL },
    { query: "residual connection", url: RESIDUAL_CONNECTION_URL },
    { query: "skip connection", url: SKIP_CONNECTION_URL },
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

  test.each([
    { query: "routing", expectedRank: "first" },
    { query: "request routing", expectedRank: "first" },
    { query: "inference routing", expectedRank: "first" },
    { query: "serve request to specialist model", expectedRank: "contains" },
  ] as const)("Orama database resolves the canonical routing system page for %s", async ({
    query,
    expectedRank,
  }) => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const documents = buildSearchDocuments(pages, registry);
    const db = await createOramaDatabase(documents);
    const { hits } = await search(db, { term: query });

    expect(hits.length).toBeGreaterThan(0);

    if (expectedRank === "first") {
      expect((hits[0]?.document as { url: string }).url).toBe(
        ROUTING_SYSTEM_URL,
      );
      return;
    }

    expect(
      hits.some(
        (hit) => (hit.document as { url: string }).url === ROUTING_SYSTEM_URL,
      ),
    ).toBe(true);
  });
});

describe("build-search-index script", () => {
  test("writes generated snapshot for all published docs pages", async () => {
    if (existsSync(GENERATED_INDEX_PATH)) {
      rmSync(GENERATED_INDEX_PATH);
    }

    const result = spawnSync("bun", ["./scripts/build-search-index.ts"], {
      cwd: process.cwd(),
      encoding: "utf8",
      env: BUILD_SEARCH_INDEX_TEST_ENV,
    });

    expect(result.status).toBe(0);
    expect(result.stderr).toBe("");
    expect(existsSync(GENERATED_INDEX_PATH)).toBe(true);

    const snapshot = JSON.parse(
      readFileSync(GENERATED_INDEX_PATH, "utf8"),
    ) as Awaited<ReturnType<typeof exportOramaIndexSnapshot>>;

    expect(snapshot.version).toBe(1);
    expect(snapshot.orama).toBeDefined();
    const pages = await loadPublishedDocsPages("en");
    const expectedUrls = pages.map((page) => page.url).sort();
    const urls = snapshot.documents.map((document) => document.url).sort();
    expect(snapshot.documents.length).toBe(expectedUrls.length);
    expect(urls).toEqual(expectedUrls);
    expect(urls).toEqual(
      expect.arrayContaining([...PUBLISHED_SEARCH_INDEX_URLS]),
    );

    const gqa = findSnapshotDocument(snapshot.documents, SAMPLE_URL);
    expect(gqa?.title).toBe("Grouped-Query Attention");
    expect(gqa?.kind).toBe("module");
    expect(gqa?.tags).toEqual(
      expect.arrayContaining(["attention", "kv-cache"]),
    );

    rmSync(GENERATED_INDEX_PATH, { force: true });
  });
});
