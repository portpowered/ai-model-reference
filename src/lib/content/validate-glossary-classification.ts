import { join } from "node:path";
import type { DocsPageSource } from "./pages";
import type { RegistryIndexes } from "./registry";
import type { ConceptRecord } from "./schemas";
import type { ValidationError } from "./validate-registry";

function hasExplicitGlossaryFallback(record: ConceptRecord): boolean {
  return Boolean(record.sidebarGrouping?.glossary);
}

export function validatePublishedGlossaryClassification(
  page: DocsPageSource,
  indexes: RegistryIndexes,
): ValidationError[] {
  if (page.frontmatter.kind !== "glossary") {
    return [];
  }

  const pagePath = join(page.pageDir, "page.mdx");
  const { registryId } = page.frontmatter;
  const registryRecord = indexes.byId.get(registryId);

  if (registryRecord?.kind !== "concept") {
    return [];
  }

  const record = registryRecord as ConceptRecord;

  if (record.primaryClassificationId) {
    if (!indexes.classificationsById.has(record.primaryClassificationId)) {
      return [
        {
          code: "unresolved-glossary-classification",
          message: `${page.url}: primaryClassificationId "${record.primaryClassificationId}" does not resolve to a classification record for registryId "${registryId}"`,
          path: pagePath,
        },
      ];
    }
    return [];
  }

  if (hasExplicitGlossaryFallback(record)) {
    return [];
  }

  return [
    {
      code: "missing-glossary-classification",
      message: `${page.url}: published glossary page requires primaryClassificationId or explicit sidebarGrouping.glossary fallback for registryId "${registryId}"`,
      path: pagePath,
    },
  ];
}
