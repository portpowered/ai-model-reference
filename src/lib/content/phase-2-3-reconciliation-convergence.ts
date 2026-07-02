import { loadPublishedArchitectureEntries } from "@/lib/content/architecture";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { publishedResourceMatchesTag } from "@/lib/content/phase-1-published-resources";
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

type RepresentativeDiscoveryContract = {
  pageUrl: string;
  expectedKind: "concept" | "glossary" | "module";
  requiredTagSlugs: readonly string[];
  representativeQueries: readonly string[];
};

/** Representative routes that must stay aligned across source, tag landing, and search. */
export const REPRESENTATIVE_DISCOVERY_CONTRACTS = [
  {
    pageUrl: "/docs/modules/grouped-query-attention",
    expectedKind: "module",
    requiredTagSlugs: ["attention", "kv-cache"],
    representativeQueries: ["GQA"],
  },
  {
    pageUrl: "/docs/glossary/transformer",
    expectedKind: "glossary",
    requiredTagSlugs: ["taxonomy", "model-family"],
    representativeQueries: ["transformer"],
  },
  {
    pageUrl: "/docs/concepts/positional-encodings",
    expectedKind: "concept",
    requiredTagSlugs: ["position-encoding", "foundations"],
    representativeQueries: ["positional encodings"],
  },
  {
    pageUrl: "/docs/glossary/skip-connection",
    expectedKind: "glossary",
    requiredTagSlugs: ["foundations"],
    representativeQueries: ["skip connection"],
  },
] as const satisfies readonly RepresentativeDiscoveryContract[];

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
  const label =
    "Fumadocs source resolves representative glossary, concept, and module pages";

  const pages = await loadPublishedDocsPages("en");
  const pageByUrl = new Map(pages.map((page) => [page.url, page]));

  for (const contract of REPRESENTATIVE_DISCOVERY_CONTRACTS) {
    const page = pageByUrl.get(contract.pageUrl);
    if (!page) {
      return failResult(
        domainId,
        label,
        `missing representative published page ${contract.pageUrl}`,
      );
    }

    if (page.frontmatter.kind !== contract.expectedKind) {
      return failResult(
        domainId,
        label,
        `${contract.pageUrl} kind ${page.frontmatter.kind} !== ${contract.expectedKind}`,
      );
    }

    const sourcePage = source.getPage(docsSlugFromUrl(contract.pageUrl));
    if (!sourcePage) {
      return failResult(
        domainId,
        label,
        `source.getPage returned undefined for ${contract.pageUrl}`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runAttentionTagGroupingGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "attention-tag-grouping";
  const label =
    "Representative tag landing routes stay aligned with published-page discovery contracts";

  const messages = await loadUiMessages();
  const registry = await loadRegistry();
  const pages = await loadPublishedDocsPages("en");
  const pageByUrl = new Map(pages.map((page) => [page.url, page]));

  for (const contract of REPRESENTATIVE_DISCOVERY_CONTRACTS) {
    const page = pageByUrl.get(contract.pageUrl);
    if (!page) {
      return failResult(
        domainId,
        label,
        `missing representative published page ${contract.pageUrl}`,
      );
    }

    for (const tagSlug of contract.requiredTagSlugs) {
      if (!publishedResourceMatchesTag(page, tagSlug, registry)) {
        return failResult(
          domainId,
          label,
          `${contract.pageUrl} no longer resolves tag ${tagSlug} from published-page discovery`,
        );
      }

      const groups = await loadTagResourceGroups(tagSlug, messages, "en");
      const expectedGroup = groups.find(
        (group) => group.kind === contract.expectedKind,
      );

      if (!expectedGroup) {
        return failResult(
          domainId,
          label,
          `/tags/${tagSlug} is missing ${contract.expectedKind} group`,
        );
      }

      if (
        !expectedGroup.resources.some((entry) => entry.url === contract.pageUrl)
      ) {
        return failResult(
          domainId,
          label,
          `/tags/${tagSlug} is missing representative route ${contract.pageUrl}`,
        );
      }
    }
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
    "Search documents index representative routes with correct kinds and discovery tags";

  const registry = await loadRegistry();
  const pages = await loadPublishedDocsPages("en");
  const documents = buildSearchDocuments(pages, registry);
  const byUrl = new Map(documents.map((document) => [document.url, document]));

  for (const contract of REPRESENTATIVE_DISCOVERY_CONTRACTS) {
    const document = byUrl.get(contract.pageUrl);
    if (!document) {
      return failResult(
        domainId,
        label,
        `missing search document for ${contract.pageUrl}`,
      );
    }

    if (document.kind !== contract.expectedKind) {
      return failResult(
        domainId,
        label,
        `${contract.pageUrl} kind ${document.kind ?? "undefined"} !== ${contract.expectedKind}`,
      );
    }

    for (const tagSlug of contract.requiredTagSlugs) {
      if (!document.tags.includes(tagSlug)) {
        return failResult(
          domainId,
          label,
          `${contract.pageUrl} search document is missing tag ${tagSlug}`,
        );
      }
    }
  }

  const representedKinds = new Set(
    REPRESENTATIVE_DISCOVERY_CONTRACTS.map((contract) => contract.expectedKind),
  );
  for (const kind of ["glossary", "concept", "module"] as const) {
    if (!representedKinds.has(kind)) {
      return failResult(
        domainId,
        label,
        `missing representative discovery contract for ${kind}`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runRepresentativeSearchQueriesGate(): Promise<Phase23ReconciliationConvergenceDomainResult> {
  const domainId = "representative-search-queries";
  const label =
    "Representative search queries stay aligned with the published-page discovery contracts";

  const metaMap = await loadSearchResultMetaMap();

  for (const contract of REPRESENTATIVE_DISCOVERY_CONTRACTS) {
    for (const query of contract.representativeQueries) {
      const results = await docsSearchApi.search(query);
      if (results.length === 0) {
        return failResult(
          domainId,
          label,
          `query "${query}" returned no results`,
        );
      }

      const firstUrl = pageBaseUrl(results[0]?.url ?? "");
      if (firstUrl !== contract.pageUrl) {
        return failResult(
          domainId,
          label,
          `query "${query}" first hit ${firstUrl} !== ${contract.pageUrl}`,
        );
      }

      const kind = metaMap.get(contract.pageUrl)?.kind;
      if (kind !== contract.expectedKind) {
        return failResult(
          domainId,
          label,
          `query "${query}" kind ${kind ?? "undefined"} !== ${contract.expectedKind}`,
        );
      }
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
