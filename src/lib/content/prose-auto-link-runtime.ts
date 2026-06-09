import {
  conceptPageHref,
  glossaryPageHref,
  modulePageHref,
  tagPageHref,
} from "@/lib/content/content-hrefs";
import {
  buildProseAutoLinkPhrases,
  type ProseAutoLinkCandidate,
  type ProseAutoLinkPhrase,
} from "@/lib/content/prose-auto-link";
import { PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS } from "@/lib/content/published-docs-registry-ids";
import {
  listConceptRecords,
  listModuleRecords,
} from "@/lib/content/registry-runtime";
import type {
  ConceptRecord,
  ModuleRecord,
  TagRecord,
} from "@/lib/content/schemas";
import { listTagRecords } from "@/lib/content/tag-registry-runtime";

function uniquePhrases(phrases: string[]): string[] {
  return [...new Set(phrases.filter((phrase) => phrase.length > 0))];
}

function aliasCandidates(
  aliases: string[],
  href: string,
): ProseAutoLinkCandidate[] {
  return uniquePhrases(aliases).map((phrase) => ({ phrase, href }));
}

function moduleCandidates(record: ModuleRecord): ProseAutoLinkCandidate[] {
  if (record.status !== "published") {
    return [];
  }
  return aliasCandidates(record.aliases, modulePageHref(record.slug));
}

function conceptCandidates(record: ConceptRecord): ProseAutoLinkCandidate[] {
  if (record.status !== "published") {
    return [];
  }
  const href = PUBLISHED_CONCEPT_SECTION_REGISTRY_IDS.has(record.id)
    ? conceptPageHref(record.slug)
    : glossaryPageHref(record.slug);
  return aliasCandidates(record.aliases, href);
}

function tagCandidates(record: TagRecord): ProseAutoLinkCandidate[] {
  if (record.status !== "published") {
    return [];
  }
  return aliasCandidates(record.aliases, tagPageHref(record.slug));
}

function buildCandidates(): ProseAutoLinkCandidate[] {
  return [
    ...listModuleRecords().flatMap(moduleCandidates),
    ...listConceptRecords().flatMap(conceptCandidates),
    ...listTagRecords().flatMap(tagCandidates),
  ];
}

export const PROSE_AUTO_LINK_PHRASES: ProseAutoLinkPhrase[] =
  buildProseAutoLinkPhrases(buildCandidates());
