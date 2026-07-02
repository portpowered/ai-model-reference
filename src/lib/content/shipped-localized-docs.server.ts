import { existsSync, readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { defaultLocale, supportedLocales } from "@/lib/i18n/locale-routing";
import { DOCS_ROOT } from "./content-paths";
import { pageFrontmatterSchema } from "./schemas";
import type {
  NonDefaultLocale,
  ShippedLocalizedDocsManifest,
} from "./shipped-localized-docs";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

const nonDefaultLocales = supportedLocales.filter(
  (locale): locale is NonDefaultLocale => locale !== defaultLocale,
);

const manifestCache = new Map<string, ShippedLocalizedDocsManifest>();

function parseFrontmatter(pageMdxPath: string) {
  const source = readFileSync(pageMdxPath, "utf8");
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new Error(`Missing frontmatter in ${pageMdxPath}`);
  }

  return pageFrontmatterSchema.parse(parseYamlFrontmatterBlock(match[1]));
}

function findPageDirectories(rootDir: string): string[] {
  const directories: string[] = [];

  for (const entry of readdirSync(rootDir, { withFileTypes: true })) {
    if (!entry.isDirectory()) {
      continue;
    }

    const pageDir = path.join(rootDir, entry.name);
    const pageMdxPath = path.join(pageDir, "page.mdx");
    if (existsSync(pageMdxPath)) {
      directories.push(pageDir);
      continue;
    }

    directories.push(...findPageDirectories(pageDir));
  }

  return directories;
}

function createEmptyManifest(): ShippedLocalizedDocsManifest {
  return {
    ja: [],
    vi: [],
  };
}

function hasNonDefaultLocaleMessages(
  pageDirectory: string,
  locale: NonDefaultLocale,
): boolean {
  return existsSync(path.join(pageDirectory, "messages", `${locale}.json`));
}

export function deriveShippedLocalizedDocsManifest(
  docsRoot = DOCS_ROOT,
): ShippedLocalizedDocsManifest {
  const cached = manifestCache.get(docsRoot);
  if (cached) {
    return cached;
  }

  const shippedDocsByLocale: Record<NonDefaultLocale, string[]> = {
    ja: [],
    vi: [],
  };

  for (const pageDirectory of findPageDirectories(docsRoot)) {
    const frontmatter = parseFrontmatter(path.join(pageDirectory, "page.mdx"));
    if (frontmatter.status !== "published") {
      continue;
    }

    const docsSlug = path.relative(docsRoot, pageDirectory).replace(/\\/g, "/");

    for (const locale of nonDefaultLocales) {
      if (hasNonDefaultLocaleMessages(pageDirectory, locale)) {
        shippedDocsByLocale[locale].push(docsSlug);
      }
    }
  }

  const manifest: ShippedLocalizedDocsManifest = {
    ja: shippedDocsByLocale.ja.sort(),
    vi: shippedDocsByLocale.vi.sort(),
  };
  manifestCache.set(docsRoot, manifest);
  return manifest;
}

export function resolveDerivedShippedLocalizedDocsManifest(
  overrides: Partial<ShippedLocalizedDocsManifest> = {},
  docsRoot = DOCS_ROOT,
): ShippedLocalizedDocsManifest {
  const derivedManifest = deriveShippedLocalizedDocsManifest(docsRoot);
  return {
    ja: overrides.ja ?? derivedManifest.ja,
    vi: overrides.vi ?? derivedManifest.vi,
  };
}

export function resetDerivedShippedLocalizedDocsManifestCache() {
  manifestCache.clear();
}

export function createEmptyShippedLocalizedDocsManifest(): ShippedLocalizedDocsManifest {
  return createEmptyManifest();
}
