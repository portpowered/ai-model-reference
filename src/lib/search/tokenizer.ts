import { type AnyOrama, create, type Tokenizer } from "@orama/orama";

const JAPANESE_CHAR_PATTERN =
  /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}]/u;
const JAPANESE_SPLIT_PATTERN =
  /[\s\n\r\t.,:;!?()[\]{}<>/\\|"'`~^&*_+=\-。、・：；！？「」『』（）【】]/u;
const LATIN_EDGE_PUNCTUATION = /^[^a-z0-9]+|[^a-z0-9-]+$/g;

function containsJapanese(text: string): boolean {
  return JAPANESE_CHAR_PATTERN.test(text);
}

function splitJapaneseSegments(raw: string): string[] {
  return raw
    .split(JAPANESE_SPLIT_PATTERN)
    .map((segment) => segment.trim())
    .filter((segment) => segment.length > 1 && containsJapanese(segment));
}

function buildJapaneseIndexTokens(raw: string): string[] {
  const tokens = new Set<string>();

  for (const segment of splitJapaneseSegments(raw)) {
    const compact = segment.replace(/\s+/gu, "");
    if (compact.length <= 1) {
      continue;
    }

    tokens.add(compact);
    const maxLength = Math.min(compact.length, 12);
    for (let length = 2; length <= maxLength; length += 1) {
      for (let start = 0; start <= compact.length - length; start += 1) {
        tokens.add(compact.slice(start, start + length));
        if (tokens.size >= 2000) {
          return [...tokens];
        }
      }
    }
  }

  return [...tokens];
}

function buildJapaneseQueryTokens(raw: string): string[] {
  return splitJapaneseSegments(raw)
    .map((segment) => segment.replace(/\s+/gu, ""))
    .filter((segment) => segment.length > 1);
}

function splitLatinSegments(raw: string): string[] {
  return raw
    .toLowerCase()
    .split(/\s+/u)
    .map((segment) => segment.replace(LATIN_EDGE_PUNCTUATION, ""))
    .filter((segment) => segment.length > 0);
}

function buildLatinIndexTokens(raw: string): string[] {
  const tokens = new Set<string>();

  for (const segment of splitLatinSegments(raw)) {
    tokens.add(segment);

    if (!segment.includes("-")) {
      continue;
    }

    for (const part of segment.split("-")) {
      if (part.length > 0) {
        tokens.add(part);
      }
    }
  }

  return [...tokens];
}

export function createModelAtlasSearchTokenizer(): Tokenizer {
  return {
    language: "model-atlas",
    normalizationCache: new Map<string, string>(),
    tokenize(raw, _language, prop) {
      const latinTokens =
        prop === undefined ? splitLatinSegments(raw) : buildLatinIndexTokens(raw);
      if (!containsJapanese(raw)) {
        return latinTokens;
      }

      const japaneseTokens =
        prop === undefined
          ? buildJapaneseQueryTokens(raw)
          : buildJapaneseIndexTokens(raw);

      return [...new Set([...latinTokens, ...japaneseTokens])];
    },
  };
}

export function createModelAtlasSearchDatabase(): AnyOrama {
  return create({
    schema: { _: "string" },
    components: {
      tokenizer: createModelAtlasSearchTokenizer(),
    },
  });
}
