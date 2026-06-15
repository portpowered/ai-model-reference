import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadPhase1AttentionModuleUrls } from "@/lib/content/phase-1-published-resources";
import { PUBLISHED_DOCS_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import { loadRegistry } from "@/lib/content/registry";
import {
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { validateRegistryContent } from "@/lib/content/validate-registry";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { pageBaseUrl } from "@/lib/search/collapse-search-results-to-page-hits";
import { loadSearchResultMetaMap } from "@/lib/search/search-result-meta";
import { docsSearchApi } from "@/lib/search/search-server";
import { source } from "@/lib/source";

export const PHASE_2_3_RECONCILIATION_CONVERGENCE_GATE_HEADER =
  "Phase 2/3 reconciliation convergence gate";

export type Phase23ReconciliationConvergenceDomainId =
  | "registry-validation"
  | "source-discovery"
  | "attention-tag-grouping"
  | "architecture-forward-links"
  | "search-document-kind-facets"
  | "representative-search-queries";

export type Phase23ReconciliationConvergenceDomainStatus = "pass" | "fail";

export type Phase23ReconciliationConvergenceDomainResult = {
  domainId: Phase23ReconciliationConvergenceDomainId;
  label: string;
  status: Phase23ReconciliationConvergenceDomainStatus;
  reason?: string;
};

/** Batch 017 pages reconciled in Phase 2/3 (see prd.md). */
export const BATCH_017_DOCS_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
  "/docs/modules/attention",
  "/docs/modules/multi-head-attention",
  "/docs/modules/multi-query-attention",
  "/docs/modules/multi-head-latent-attention",
  "/docs/modules/sparse-attention",
  "/docs/modules/sliding-window-attention",
  "/docs/modules/linear-attention",
  "/docs/concepts/transformer-architecture",
  "/docs/glossary/feed-forward-network",
  "/docs/glossary/mixture-of-experts",
  "/docs/glossary/normalization",
  "/docs/glossary/layer-norm",
  "/docs/glossary/rmsnorm",
  "/docs/glossary/residual-connection",
  "/docs/concepts/positional-encodings",
  "/docs/glossary/rope",
  "/docs/glossary/alibi",
  "/docs/glossary/context-window",
  "/docs/concepts/context-extension",
  "/docs/concepts/why-long-context-is-hard",
] as const;

const MODEL_FAMILY_REGISTRY_IDS = [
  "concept.transformer",
  "concept.diffusion-model",
  "concept.multimodal-model",
  "concept.world-model",
] as const;

const MODEL_FAMILY_GLOSSARY_URLS = [
  "/docs/glossary/transformer",
  "/docs/glossary/diffusion-model",
  "/docs/glossary/multimodal-model",
  "/docs/glossary/world-model",
] as const;

const REPRESENTATIVE_SEARCH_QUERY_EXPECTATIONS = [
  {
    query: "transformer",
    firstUrl: "/docs/glossary/transformer",
    firstKind: "glossary" as const,
  },
  {
    query: "diffusion model",
    firstUrl: "/docs/glossary/diffusion-model",
    firstKind: "glossary" as const,
  },
  {
    query: "MHA",
    firstUrl: "/docs/modules/multi-head-attention",
    firstKind: "module" as const,
  },
  {
    query: "MQA",
    firstUrl: "/docs/modules/multi-query-attention",
    firstKind: "module" as const,
  },
  {
    query: "sparse attention",
    firstUrl: "/docs/modules/sparse-attention",
    firstKind: "module" as const,
  },
  {
    query: "RoPE",
    firstUrl: "/docs/glossary/rope",
    firstKind: "glossary" as const,
  },
  {
    query: "context window",
    firstUrl: "/docs/glossary/context-window",
    firstKind: "glossary" as const,
  },
] as const;

function docsSlugFromUrl(url: string): string[] {
  return url.replace("/docs/", "").split("/");
}

function passResult(
  domainId: Phase23ReconciliationConvergenceDomainId,
  label: string,
): Phase23ReconciliationConvergenceDomainResult {
  return { domainId, label, status: "pass" };
}

function failResult(
  domainId: Phase23ReconciliationConvergenceDomainId,
  label: string,
  reason: string,
): Phase23ReconciliationConvergenceDomainResult {
  return { domainId, label, status: "fail", reason };
}

export async function runRegistryValidationGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "registry-validation";
  const label = "Registry validation passes for integrated Phase 2/3 content";

  const errors = await validateRegistryContent();
  if (errors.length > 0) {
    return failResult(
      domainId,
      label,
      `validateRegistryContent reported ${errors.length} error(s): ${errors.slice(0, 3).join("; ")}`,
    );
  }

  return passResult(domainId, label);
}

export async function runSourceDiscoveryGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "source-discovery";
  const label = "Fumadocs source discovers every batch 017 published page";

  const pages = await loadPublishedDocsPages("en");
  const urls = new Set(pages.map((page) => page.url));

  for (const url of BATCH_017_DOCS_URLS) {
    if (!urls.has(url)) {
      return failResult(domainId, label, `missing published page URL ${url}`);
    }

    const page = source.getPage(docsSlugFromUrl(url));
    if (!page) {
      return failResult(
        domainId,
        label,
        `source.getPage returned undefined for ${url}`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runAttentionTagGroupingGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "attention-tag-grouping";
  const label = "/tags/attention lists all published attention modules by kind";

  const messages = await loadUiMessages();
  const groups = await loadTagResourceGroups("attention", messages, "en");
  const moduleGroup = groups.find((group) => group.kind === "module");

  if (!moduleGroup) {
    return failResult(
      domainId,
      label,
      "missing Module kind group on /tags/attention",
    );
  }

  const moduleUrls = moduleGroup.resources.map((resource) => resource.url);
  const expectedModuleUrls = await loadPhase1AttentionModuleUrls("en");
  for (const url of expectedModuleUrls) {
    if (!moduleUrls.includes(url)) {
      return failResult(
        domainId,
        label,
        `missing attention module resource ${url}`,
      );
    }
  }

  if (moduleUrls.length !== expectedModuleUrls.length) {
    return failResult(
      domainId,
      label,
      `expected ${expectedModuleUrls.length} attention modules, found ${moduleUrls.length}`,
    );
  }

  return passResult(domainId, label);
}

export async function runArchitectureForwardLinksGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "architecture-forward-links";
  const label =
    "Architecture-forward navigation links to published model family concepts";

  const indexes = await loadRegistry();
  for (const id of MODEL_FAMILY_REGISTRY_IDS) {
    const record = indexes.byId.get(id);
    if (record?.status !== "published") {
      return failResult(
        domainId,
        label,
        `registry record ${id} is not published`,
      );
    }
    if (!PUBLISHED_DOCS_REGISTRY_IDS.has(id)) {
      return failResult(
        domainId,
        label,
        `PUBLISHED_DOCS_REGISTRY_IDS missing ${id}`,
      );
    }
  }

  const sourceRecord = getRegistryRecordById("concept.architecture");
  if (!sourceRecord) {
    return failResult(
      domainId,
      label,
      "concept.architecture missing from registry runtime",
    );
  }

  const items = deriveCuratedRelatedItems(
    sourceRecord,
    listRelatedRegistryRecords(),
    PUBLISHED_DOCS_REGISTRY_IDS,
  );

  for (const [index, id] of MODEL_FAMILY_REGISTRY_IDS.entries()) {
    const item = items.find((entry) => entry.registryId === id);
    if (item?.isPlanned) {
      return failResult(
        domainId,
        label,
        `curated related item ${id} is still planned`,
      );
    }
    if (item?.href !== MODEL_FAMILY_GLOSSARY_URLS[index]) {
      return failResult(
        domainId,
        label,
        `curated related item ${id} href mismatch: ${item?.href ?? "undefined"}`,
      );
    }
  }

  const entries = await loadPublishedArchitectureEntries("en");
  const entryByUrl = new Map(entries.map((entry) => [entry.url, entry]));
  for (const url of MODEL_FAMILY_GLOSSARY_URLS) {
    if (!entryByUrl.has(url)) {
      return failResult(
        domainId,
        label,
        `/docs/architecture index missing ${url}`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runSearchDocumentKindFacetsGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "search-document-kind-facets";
  const label =
    "Search documents index batch 017 pages with correct kind facets";

  const registry = await loadRegistry();
  const pages = await loadPublishedDocsPages("en");
  const documents = buildSearchDocuments(pages, registry);
  const byUrl = new Map(documents.map((document) => [document.url, document]));

  for (const url of BATCH_017_DOCS_URLS) {
    const document = byUrl.get(url);
    if (!document) {
      return failResult(domainId, label, `missing search document for ${url}`);
    }

    const expectedKind = url.startsWith("/docs/glossary/")
      ? "glossary"
      : url.startsWith("/docs/concepts/")
        ? "concept"
        : "module";

    if (document.kind !== expectedKind) {
      return failResult(
        domainId,
        label,
        `${url} kind ${document.kind ?? "undefined"} !== ${expectedKind}`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runRepresentativeSearchQueriesGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "representative-search-queries";
  const label =
    "Representative search queries rank canonical pages with correct kind metadata";

  const metaMap = await loadSearchResultMetaMap();

  for (const expectation of REPRESENTATIVE_SEARCH_QUERY_EXPECTATIONS) {
    const results = await docsSearchApi.search(expectation.query);
    if (results.length === 0) {
      return failResult(
        domainId,
        label,
        `query "${expectation.query}" returned no results`,
      );
    }

    const firstUrl = pageBaseUrl(results[0]?.url ?? "");
    if (firstUrl !== expectation.firstUrl) {
      return failResult(
        domainId,
        label,
        `query "${expectation.query}" first hit ${firstUrl} !== ${expectation.firstUrl}`,
      );
    }

    const kind = metaMap.get(expectation.firstUrl)?.kind;
    if (kind !== expectation.firstKind) {
      return failResult(
        domainId,
        label,
        `query "${expectation.query}" kind ${kind ?? "undefined"} !== ${expectation.firstKind}`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runPhase23ReconciliationConvergenceGate(): Promise<
  readonly Phase23ReconciliationConvergenceDomainResult[]
> {
  return [
    await runRegistryValidationGate(),
    await runSourceDiscoveryGate(),
    await runAttentionTagGroupingGate(),
    await runArchitectureForwardLinksGate(),
    await runSearchDocumentKindFacetsGate(),
    await runRepresentativeSearchQueriesGate(),
  ];
}

export function getPhase23ReconciliationConvergenceExitCode(
  results: readonly Phase23ReconciliationConvergenceDomainResult[],
): 0 | 1 {
  return results.some((result) => result.status === "fail") ? 1 : 0;
}

export function formatPhase23ReconciliationConvergenceReport(
  results: readonly Phase23ReconciliationConvergenceDomainResult[],
): string {
  const lines = [PHASE_2_3_RECONCILIATION_CONVERGENCE_GATE_HEADER, ""];
  for (const result of results) {
    const statusLabel = result.status === "pass" ? "PASS" : "FAIL";
    lines.push(`[${statusLabel}] ${result.label}`);
    if (result.reason) {
      lines.push(`  reason: ${result.reason}`);
    }
  }
  return lines.join("\n");
}
