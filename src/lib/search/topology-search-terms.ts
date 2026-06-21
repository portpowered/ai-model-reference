import type { SearchDocument } from "./types";

const TOPOLOGY_SEPARATOR_PATTERN = /[._/-]+/g;
const COMPACT_SEPARATOR_PATTERN = /[\s._/-]+/g;

function unique(values: string[]): string[] {
  return [...new Set(values.filter(Boolean))];
}

function normalizeWhitespace(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

function compactAdjacentWordPairs(value: string): string[] {
  const words = value
    .toLowerCase()
    .split(/\s+/)
    .filter((word) => /^[a-z0-9]+$/.test(word));

  const pairs: string[] = [];
  for (let index = 0; index < words.length - 1; index += 1) {
    pairs.push(`${words[index]}${words[index + 1]}`);
  }
  return pairs;
}

export function expandTopologySearchTerm(term: string): string[] {
  const trimmed = normalizeWhitespace(term);
  if (!trimmed) {
    return [];
  }

  const spaced = normalizeWhitespace(
    trimmed.replace(TOPOLOGY_SEPARATOR_PATTERN, " "),
  );
  const compact = trimmed.replace(COMPACT_SEPARATOR_PATTERN, "");

  return unique([
    trimmed,
    spaced,
    compact,
    ...compactAdjacentWordPairs(spaced),
  ]);
}

export function topologySearchTerms(document: SearchDocument): string[] {
  return unique(document.topology.terms.flatMap(expandTopologySearchTerm));
}

export function topologySearchText(document: SearchDocument): string {
  return topologySearchTerms(document).join("\n");
}
