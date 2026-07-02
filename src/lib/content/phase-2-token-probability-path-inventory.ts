import { existsSync } from "node:fs";
import { join } from "node:path";
import { glossaryPageHref } from "@/lib/content/content-hrefs";
import {
  GLOSSARY_DOCS_ROOT,
  getProjectRoot,
} from "@/lib/content/content-paths";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import {
  getPublishedDocsRegistryIds,
  getRegistryRecordById,
  listRelatedRegistryRecords,
} from "@/lib/content/registry-runtime";
import { deriveCuratedRelatedItems } from "@/lib/content/related-docs";
import type { ConceptRecord } from "@/lib/content/schemas";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { source } from "@/lib/source";

/** Slugs inventoried for the Phase 2 token-to-probability foundation path. */
export const FOUNDATION_PATH_INVENTORY_SLUGS = [
  "token",
  "embedding",
  "logit",
  "softmax",
  "tensor",
  "entropy",
  "temperature",
  "parameter",
  "activation",
  "computational-graph",
  "gradient",
  "backpropagation",
  "loss-function",
  "optimizer-state",
] as const;

export type FoundationPathInventorySlug =
  (typeof FOUNDATION_PATH_INVENTORY_SLUGS)[number];

/** Target path pages a beginner should reach from /docs/glossary/token. */
export const TARGET_PATH_REGISTRY_IDS = [
  "concept.token",
  "concept.embedding",
  "concept.logit",
  "concept.softmax",
] as const;

export type TargetPathRegistryId = (typeof TARGET_PATH_REGISTRY_IDS)[number];

/** Ordered registry ids for the published forward learning chain. */
export const FORWARD_LEARNING_PATH_REGISTRY_IDS = [
  "concept.token",
  "concept.embedding",
  "concept.tensor",
  "concept.logit",
  "concept.softmax",
] as const;

export type FoundationPathRepairCategory =
  | "token-to-embedding"
  | "token-to-logit"
  | "token-to-softmax"
  | "route"
  | "search-facet"
  | "message-key"
  | "registry-relationship"
  | "validation";

export type FoundationPathOutOfScopeCategory =
  | "phase-3-transformer-component-expansion"
  | "localization-implementation"
  | "model-family-pages"
  | "broad-content-rewrite";

export const FOUNDATION_PATH_OUT_OF_SCOPE_WORK: readonly {
  category: FoundationPathOutOfScopeCategory;
  description: string;
}[] = [
  {
    category: "phase-3-transformer-component-expansion",
    description:
      "Transformer component modules and glossary pages outside the token-to-probability path.",
  },
  {
    category: "localization-implementation",
    description:
      "Non-default locale message files and translation coverage beyond preserving valid en.json keys.",
  },
  {
    category: "model-family-pages",
    description:
      "Model-family glossary pages such as transformer, diffusion-model, and world-model.",
  },
  {
    category: "broad-content-rewrite",
    description:
      "Full Phase 2 foundation prose rewrites when routes, registry, search, and related docs already publish.",
  },
];

export type FoundationPathAssetStatus = {
  publishedRoute: boolean;
  pageBundle: boolean;
  registryRecord: boolean;
  tags: boolean;
  relatedDocs: boolean;
  searchDocument: boolean;
  pageSpecWorkflowOutput: boolean;
};

export type FoundationPathInventoryRow = {
  slug: FoundationPathInventorySlug;
  registryId: `concept.${FoundationPathInventorySlug}`;
  canonicalRoute: string;
  assets: FoundationPathAssetStatus;
  inScopeRepairs: FoundationPathRepairCategory[];
};

export type FoundationPathInventory = {
  rows: FoundationPathInventoryRow[];
  outOfScopeWork: typeof FOUNDATION_PATH_OUT_OF_SCOPE_WORK;
};

function registryIdForSlug(
  slug: FoundationPathInventorySlug,
): `concept.${FoundationPathInventorySlug}` {
  return `concept.${slug}`;
}

function pageBundleExists(slug: FoundationPathInventorySlug): boolean {
  return existsSync(join(GLOSSARY_DOCS_ROOT, slug, "page.mdx"));
}

function pageSpecWorkflowOutputExists(
  slug: FoundationPathInventorySlug,
): boolean {
  return existsSync(join(getProjectRoot(), "page-specs", `${slug}.json`));
}

function resolveTag(
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  tagRef: string,
): boolean {
  const bySlug = indexes.bySlug.get(tagRef);
  if (bySlug?.kind === "tag") {
    return true;
  }
  const tagId = tagRef.startsWith("tag.") ? tagRef : `tag.${tagRef}`;
  return indexes.byId.get(tagId)?.kind === "tag";
}

function conceptHasResolvableTags(
  concept: ConceptRecord,
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
): boolean {
  if (concept.tags.length === 0) {
    return false;
  }
  return concept.tags.every((tagRef) => resolveTag(indexes, tagRef));
}

function tokenCuratedRelatedIds(): Set<string> {
  const token = getRegistryRecordById("concept.token");
  if (!token) {
    return new Set();
  }

  const items = deriveCuratedRelatedItems(
    token,
    listRelatedRegistryRecords(),
    getPublishedDocsRegistryIds(),
  );

  return new Set(items.map((item) => item.registryId));
}

function detectTokenPathRepairs(
  slug: FoundationPathInventorySlug,
  assets: FoundationPathAssetStatus,
  concept: ConceptRecord | undefined,
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  curatedRelatedIds: Set<string>,
): FoundationPathRepairCategory[] {
  const repairs: FoundationPathRepairCategory[] = [];

  if (!assets.publishedRoute) {
    repairs.push("route");
  }
  if (!assets.searchDocument) {
    repairs.push("search-facet");
  }
  if (!assets.registryRecord) {
    repairs.push("registry-relationship");
  }
  if (!assets.pageBundle) {
    repairs.push("validation");
  }
  if (concept && !conceptHasResolvableTags(concept, indexes)) {
    repairs.push("registry-relationship");
  }

  if (slug === "token") {
    if (!curatedRelatedIds.has("concept.embedding")) {
      repairs.push("token-to-embedding");
    }
    if (!curatedRelatedIds.has("concept.logit")) {
      repairs.push("token-to-logit");
    }
    if (!curatedRelatedIds.has("concept.softmax")) {
      repairs.push("token-to-softmax");
    }
  }

  return repairs;
}

function detectSupportingPathRepairs(
  slug: FoundationPathInventorySlug,
  assets: FoundationPathAssetStatus,
  concept: ConceptRecord | undefined,
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
): FoundationPathRepairCategory[] {
  const repairs: FoundationPathRepairCategory[] = [];

  const forwardIndex = FORWARD_LEARNING_PATH_REGISTRY_IDS.indexOf(
    registryIdForSlug(
      slug,
    ) as (typeof FORWARD_LEARNING_PATH_REGISTRY_IDS)[number],
  );

  if (forwardIndex === -1) {
    return repairs;
  }

  if (!assets.publishedRoute || !assets.pageBundle || !assets.registryRecord) {
    repairs.push("route");
    return repairs;
  }

  if (!assets.searchDocument) {
    repairs.push("search-facet");
  }

  if (concept && !conceptHasResolvableTags(concept, indexes)) {
    repairs.push("registry-relationship");
  }

  if (forwardIndex < FORWARD_LEARNING_PATH_REGISTRY_IDS.length - 1) {
    const nextId = FORWARD_LEARNING_PATH_REGISTRY_IDS[forwardIndex + 1];
    const next = indexes.byId.get(nextId) as ConceptRecord | undefined;
    if (!concept?.relatedIds.includes(nextId)) {
      repairs.push("registry-relationship");
    }
    if (!next?.prerequisiteIds.includes(registryIdForSlug(slug))) {
      repairs.push("registry-relationship");
    }
  }

  return repairs;
}

function detectInScopeRepairs(
  slug: FoundationPathInventorySlug,
  assets: FoundationPathAssetStatus,
  concept: ConceptRecord | undefined,
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
  curatedRelatedIds: Set<string>,
): FoundationPathRepairCategory[] {
  const targetSlugs = new Set<TargetPathRegistryId>(TARGET_PATH_REGISTRY_IDS);
  const registryId = registryIdForSlug(slug);

  if (targetSlugs.has(registryId as TargetPathRegistryId)) {
    return detectTokenPathRepairs(
      slug,
      assets,
      concept,
      indexes,
      curatedRelatedIds,
    );
  }

  return detectSupportingPathRepairs(slug, assets, concept, indexes);
}

function hasRelatedDocs(
  concept: ConceptRecord | undefined,
  indexes: Awaited<ReturnType<typeof loadRegistry>>,
): boolean {
  if (!concept) {
    return false;
  }

  const relatedIds = [
    ...concept.relatedIds,
    ...concept.prerequisiteIds,
    ...concept.explainsIds,
  ];

  if (relatedIds.length === 0) {
    return false;
  }

  return relatedIds.every((id) => indexes.byId.has(id));
}

/**
 * Builds a compact inventory of foundation-path assets and in-scope repair targets
 * for the token-to-probability convergence gate.
 */
export async function buildFoundationPathInventory(): Promise<FoundationPathInventory> {
  const indexes = await loadRegistry();
  const pages = await loadPublishedDocsPages("en");
  const searchDocuments = buildSearchDocuments(pages, indexes);
  const searchByUrl = new Map(
    searchDocuments.map((document) => [document.url, document]),
  );
  const curatedRelatedIds = tokenCuratedRelatedIds();

  const rows: FoundationPathInventoryRow[] = [];

  for (const slug of FOUNDATION_PATH_INVENTORY_SLUGS) {
    const registryId = registryIdForSlug(slug);
    const canonicalRoute = glossaryPageHref(slug);
    const concept = indexes.byId.get(registryId) as ConceptRecord | undefined;
    const publishedPage = pages.find(
      (entry) =>
        entry.url === canonicalRoute &&
        entry.frontmatter.registryId === registryId,
    );
    const searchDocument = searchByUrl.get(canonicalRoute);
    const fumadocsPage = source.getPage(["glossary", slug]);

    const assets: FoundationPathAssetStatus = {
      pageBundle: pageBundleExists(slug),
      registryRecord:
        concept?.kind === "concept" && concept.status === "published",
      tags: concept ? conceptHasResolvableTags(concept, indexes) : false,
      relatedDocs: hasRelatedDocs(concept, indexes),
      searchDocument:
        searchDocument !== undefined && searchDocument.kind === "glossary",
      pageSpecWorkflowOutput: pageSpecWorkflowOutputExists(slug),
      publishedRoute:
        publishedPage?.url === canonicalRoute &&
        publishedPage.frontmatter.status === "published" &&
        fumadocsPage?.url === canonicalRoute,
    };

    const inScopeRepairs = [
      ...new Set(
        detectInScopeRepairs(slug, assets, concept, indexes, curatedRelatedIds),
      ),
    ];

    rows.push({
      slug,
      registryId,
      canonicalRoute,
      assets,
      inScopeRepairs,
    });
  }

  return {
    rows,
    outOfScopeWork: FOUNDATION_PATH_OUT_OF_SCOPE_WORK,
  };
}

export function formatFoundationPathInventoryReport(
  inventory: FoundationPathInventory,
): string {
  const lines = [
    "Phase 2 token-to-probability foundation path inventory",
    "",
    "Out of scope:",
  ];

  for (const entry of inventory.outOfScopeWork) {
    lines.push(`- [${entry.category}] ${entry.description}`);
  }

  lines.push("", "Rows:");

  for (const row of inventory.rows) {
    const assetFlags = [
      row.assets.publishedRoute ? "route" : "route:missing",
      row.assets.pageBundle ? "bundle" : "bundle:missing",
      row.assets.registryRecord ? "registry" : "registry:missing",
      row.assets.tags ? "tags" : "tags:missing",
      row.assets.relatedDocs ? "related" : "related:missing",
      row.assets.searchDocument ? "search" : "search:missing",
      row.assets.pageSpecWorkflowOutput
        ? "page-spec"
        : "page-spec:hand-authored",
    ].join(", ");

    const repairs =
      row.inScopeRepairs.length > 0 ? row.inScopeRepairs.join(", ") : "none";

    lines.push(
      `- ${row.slug} (${row.canonicalRoute}): ${assetFlags}; in-scope repairs: ${repairs}`,
    );
  }

  return lines.join("\n");
}
