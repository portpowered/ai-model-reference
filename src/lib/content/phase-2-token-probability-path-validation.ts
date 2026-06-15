import { glossaryPageHref } from "@/lib/content/content-hrefs";
import { loadGlossaryPage } from "@/lib/content/glossary-page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { TARGET_PATH_REGISTRY_IDS } from "@/lib/content/phase-2-token-probability-path-inventory";
import { loadRegistry } from "@/lib/content/registry";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import {
  applyRelatedDocMessageOverrides,
  deriveCuratedRelatedItems,
} from "@/lib/content/related-docs";
import { buildSearchDocuments } from "@/lib/search/build-documents";

export const PHASE_2_TOKEN_PROBABILITY_PATH_VALIDATION_GATE_HEADER =
  "Phase 2 token-probability path validation gate";

export type TokenProbabilityPathValidationDomainId =
  | "target-path-routes"
  | "target-path-search-documents"
  | "token-related-docs";

export type TokenProbabilityPathValidationDomainStatus = "pass" | "fail";

export type TokenProbabilityPathValidationDomainResult = {
  domainId: TokenProbabilityPathValidationDomainId;
  label: string;
  status: TokenProbabilityPathValidationDomainStatus;
  reason?: string;
};

const TARGET_PATH_SLUGS = ["token", "embedding", "logit", "softmax"] as const;

const TOKEN_RELATED_PATH_REGISTRY_IDS = [
  "concept.embedding",
  "concept.logit",
  "concept.softmax",
] as const;

export const TOKEN_PATH_RELATED_EXPLANATIONS = {
  "concept.embedding":
    "Each token ID becomes a learned numerical representation before the model mixes context.",
  "concept.logit":
    "Next-token prediction starts as a candidate score for each vocabulary token.",
  "concept.softmax":
    "Those candidate scores convert into probabilities across the vocabulary.",
} as const;

function passResult(
  domainId: TokenProbabilityPathValidationDomainId,
  label: string,
): TokenProbabilityPathValidationDomainResult {
  return { domainId, label, status: "pass" };
}

function failResult(
  domainId: TokenProbabilityPathValidationDomainId,
  label: string,
  reason: string,
): TokenProbabilityPathValidationDomainResult {
  return { domainId, label, status: "fail", reason };
}

export async function runTargetPathRouteGate(): Promise<TokenProbabilityPathValidationDomainResult> {
  const domainId = "target-path-routes";
  const label =
    "Token, embedding, logit, and softmax publish with valid registry IDs and default-locale messages";

  const pages = await loadPublishedDocsPages("en");

  for (const registryId of TARGET_PATH_REGISTRY_IDS) {
    const slug = registryId.replace("concept.", "");
    const canonicalRoute = glossaryPageHref(slug);
    const page = pages.find(
      (entry) => entry.frontmatter.registryId === registryId,
    );

    if (!page) {
      return failResult(
        domainId,
        label,
        `missing published page for ${registryId}`,
      );
    }

    if (page.url !== canonicalRoute) {
      return failResult(
        domainId,
        label,
        `${registryId} route ${page.url} !== ${canonicalRoute}`,
      );
    }

    if (page.frontmatter.status !== "published") {
      return failResult(
        domainId,
        label,
        `${registryId} status ${page.frontmatter.status} !== published`,
      );
    }

    const registryRecord = getRegistryRecordById(registryId);
    if (registryRecord?.status !== "published") {
      return failResult(
        domainId,
        label,
        `registry record ${registryId} is missing or not published`,
      );
    }

    const glossaryPage = await loadGlossaryPage(slug);
    if (glossaryPage.messages.title.length === 0) {
      return failResult(domainId, label, `${slug} messages.title is empty`);
    }
    if ((glossaryPage.messages.openingSummary?.length ?? 0) === 0) {
      return failResult(
        domainId,
        label,
        `${slug} messages.openingSummary is empty`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runTargetPathSearchDocumentsGate(): Promise<TokenProbabilityPathValidationDomainResult> {
  const domainId = "target-path-search-documents";
  const label =
    "Search documents for token, embedding, logit, and softmax include route, title, kind/facet, aliases or tags, and summary data";

  const registry = await loadRegistry();
  const pages = await loadPublishedDocsPages("en");
  const documents = buildSearchDocuments(pages, registry);
  const byUrl = new Map(documents.map((document) => [document.url, document]));

  for (const slug of TARGET_PATH_SLUGS) {
    const url = glossaryPageHref(slug);
    const document = byUrl.get(url);

    if (!document) {
      return failResult(domainId, label, `missing search document for ${url}`);
    }

    if (document.kind !== "glossary") {
      return failResult(
        domainId,
        label,
        `${url} kind ${document.kind} !== glossary`,
      );
    }

    if (document.facets.kind !== "glossary") {
      return failResult(
        domainId,
        label,
        `${url} facet kind ${document.facets.kind} !== glossary`,
      );
    }

    if (document.title.length === 0) {
      return failResult(domainId, label, `${url} search title is empty`);
    }

    if (document.description.length === 0) {
      return failResult(domainId, label, `${url} search summary is empty`);
    }

    if (document.aliases.length === 0 && document.tags.length === 0) {
      return failResult(
        domainId,
        label,
        `${url} search document has no aliases or tags`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runTokenRelatedDocsGate(): Promise<TokenProbabilityPathValidationDomainResult> {
  const domainId = "token-related-docs";
  const label =
    "Token related-doc data includes embedding, logit, and softmax with relationship explanations";

  const tokenPage = await loadGlossaryPage("token");

  for (const registryId of TOKEN_RELATED_PATH_REGISTRY_IDS) {
    const reason = tokenPage.messages.relatedDocs?.[registryId]?.reason;
    const expectedReason = TOKEN_PATH_RELATED_EXPLANATIONS[registryId];

    if (reason !== expectedReason) {
      return failResult(
        domainId,
        label,
        `token relatedDocs[${registryId}] reason mismatch`,
      );
    }
  }

  const tokenRecord = getRegistryRecordById("concept.token");
  if (!tokenRecord) {
    return failResult(domainId, label, "concept.token missing from registry");
  }

  const curatedItems = applyRelatedDocMessageOverrides(
    deriveCuratedRelatedItems(
      tokenRecord,
      listRelatedRegistryRecords(),
      getPublishedDocsRegistryIds(),
    ),
    tokenPage.messages,
  );

  const curatedIds = curatedItems.map((item) => item.registryId);
  if (
    curatedIds.length !== TOKEN_RELATED_PATH_REGISTRY_IDS.length ||
    !TOKEN_RELATED_PATH_REGISTRY_IDS.every((id) => curatedIds.includes(id))
  ) {
    return failResult(
      domainId,
      label,
      `token curated related ids ${curatedIds.join(", ")} do not include embedding, logit, and softmax`,
    );
  }

  for (const registryId of TOKEN_RELATED_PATH_REGISTRY_IDS) {
    const item = curatedItems.find((entry) => entry.registryId === registryId);
    if (item?.reasonLabel !== TOKEN_PATH_RELATED_EXPLANATIONS[registryId]) {
      return failResult(
        domainId,
        label,
        `token curated related item ${registryId} missing relationship explanation`,
      );
    }
    if (!item?.href?.startsWith("/docs/glossary/")) {
      return failResult(
        domainId,
        label,
        `token curated related item ${registryId} href is not a published glossary route`,
      );
    }
  }

  return passResult(domainId, label);
}

export async function runTokenProbabilityPathValidationGate(): Promise<
  readonly TokenProbabilityPathValidationDomainResult[]
> {
  return [
    await runTargetPathRouteGate(),
    await runTargetPathSearchDocumentsGate(),
    await runTokenRelatedDocsGate(),
  ];
}

export function getTokenProbabilityPathValidationExitCode(
  results: readonly TokenProbabilityPathValidationDomainResult[],
): 0 | 1 {
  return results.some((result) => result.status === "fail") ? 1 : 0;
}

export function formatTokenProbabilityPathValidationReport(
  results: readonly TokenProbabilityPathValidationDomainResult[],
): string {
  const lines = [PHASE_2_TOKEN_PROBABILITY_PATH_VALIDATION_GATE_HEADER, ""];
  for (const result of results) {
    const statusLabel = result.status === "pass" ? "PASS" : "FAIL";
    lines.push(`[${statusLabel}] ${result.label}`);
    if (result.reason) {
      lines.push(`  reason: ${result.reason}`);
    }
  }
  return lines.join("\n");
}
