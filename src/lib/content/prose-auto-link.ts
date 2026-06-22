export type ProseAutoLinkCandidate = {
  phrase: string;
  href: string;
};

export type ProseAutoLinkSegment =
  | { type: "text"; value: string }
  | { type: "link"; value: string; href: string };

export type ProseAutoLinkPhrase = {
  phrase: string;
  href: string;
};

function normalizePhraseKey(phrase: string): string {
  return phrase.toLowerCase();
}

function isTagHref(href: string): boolean {
  return href.startsWith("/tags/");
}

/** Space and hyphen forms of the same alias (e.g. KV cache / KV-cache). */
export function expandPhraseVariants(phrase: string): string[] {
  const variants = new Set<string>([phrase]);
  variants.add(phrase.replace(/-/g, " "));
  variants.add(phrase.replace(/ /g, "-"));
  return [...variants];
}

/**
 * Resolves unambiguous phrase → href mappings. Phrases that map to multiple
 * hrefs are omitted so prose stays plain text instead of guessing.
 */
export function buildProseAutoLinkPhraseIndex(
  candidates: ProseAutoLinkCandidate[],
): Map<string, string> {
  const hrefsByPhrase = new Map<string, Set<string>>();

  for (const { phrase, href } of candidates) {
    for (const variant of expandPhraseVariants(phrase)) {
      const key = normalizePhraseKey(variant);
      const hrefs = hrefsByPhrase.get(key) ?? new Set<string>();
      hrefs.add(href);
      hrefsByPhrase.set(key, hrefs);
    }
  }

  const index = new Map<string, string>();
  for (const [phrase, hrefs] of hrefsByPhrase) {
    if (hrefs.size === 1) {
      index.set(phrase, [...hrefs][0]);
      continue;
    }

    const nonTagHrefs = [...hrefs].filter((href) => !isTagHref(href));
    if (nonTagHrefs.length === 1) {
      index.set(phrase, nonTagHrefs[0]);
    }
  }

  return index;
}

/** Longest-first phrase list for greedy left-to-right matching. */
export function buildProseAutoLinkPhrases(
  candidates: ProseAutoLinkCandidate[],
): ProseAutoLinkPhrase[] {
  const index = buildProseAutoLinkPhraseIndex(candidates);
  const phrases: ProseAutoLinkPhrase[] = [];
  const seen = new Set<string>();

  for (const candidate of candidates) {
    for (const variant of expandPhraseVariants(candidate.phrase)) {
      const normalized = normalizePhraseKey(variant);
      if (index.get(normalized) !== candidate.href) {
        continue;
      }

      const dedupeKey = `${normalized}\0${variant}`;
      if (seen.has(dedupeKey)) {
        continue;
      }
      seen.add(dedupeKey);
      phrases.push({ phrase: variant, href: candidate.href });
    }
  }

  return phrases.sort((a, b) => b.phrase.length - a.phrase.length);
}

function isWordBoundaryBefore(text: string, index: number): boolean {
  if (index === 0) {
    return true;
  }
  return !/[a-zA-Z0-9]/.test(text[index - 1] ?? "");
}

function isWordBoundaryAfter(text: string, index: number): boolean {
  if (index >= text.length) {
    return true;
  }
  // Treat hyphen as part of a compound token so "decoder-only" does not link "decoder".
  return !/[a-zA-Z0-9-]/.test(text[index] ?? "");
}

function matchesPhraseAt(text: string, start: number, phrase: string): boolean {
  if (start + phrase.length > text.length) {
    return false;
  }

  const slice = text.slice(start, start + phrase.length);
  if (slice.toLowerCase() !== phrase.toLowerCase()) {
    return false;
  }

  return (
    isWordBoundaryBefore(text, start) &&
    isWordBoundaryAfter(text, start + phrase.length)
  );
}

/** Splits localized prose into plain text and internal doc links. */
export function segmentProseWithAutoLinks(
  text: string,
  phrases: ProseAutoLinkPhrase[],
): ProseAutoLinkSegment[] {
  if (text.length === 0 || phrases.length === 0) {
    return [{ type: "text", value: text }];
  }

  const segments: ProseAutoLinkSegment[] = [];
  let cursor = 0;

  while (cursor < text.length) {
    let matched: ProseAutoLinkPhrase | undefined;

    for (const candidate of phrases) {
      if (matchesPhraseAt(text, cursor, candidate.phrase)) {
        matched = candidate;
        break;
      }
    }

    if (!matched) {
      const nextCursor = cursor + 1;
      const previous = segments.at(-1);
      if (previous?.type === "text") {
        previous.value += text[cursor];
      } else {
        segments.push({ type: "text", value: text[cursor] });
      }
      cursor = nextCursor;
      continue;
    }

    const linkText = text.slice(cursor, cursor + matched.phrase.length);
    segments.push({ type: "link", value: linkText, href: matched.href });
    cursor += matched.phrase.length;
  }

  return segments;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Matches prose auto-link anchors regardless of `href` vs marker attribute order. */
export function proseAutoLinkAnchorOpenTagPattern(href: string): RegExp {
  return new RegExp(
    `<a\\b(?=[^>]*\\bhref="${escapeRegExp(href)}")(?=[^>]*\\bdata-prose-auto-link="true")[^>]*>`,
    "i",
  );
}

/** Matches a full prose auto-link anchor through its closing tag. */
export function proseAutoLinkAnchorPattern(href: string): RegExp {
  return new RegExp(
    `${proseAutoLinkAnchorOpenTagPattern(href).source}[\\s\\S]*?</a>`,
    "i",
  );
}
