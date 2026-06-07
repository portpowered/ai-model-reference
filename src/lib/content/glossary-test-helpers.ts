import { expect } from "bun:test";
import { proseAutoLinkAnchorPattern } from "@/lib/content/prose-auto-link";

function decodeCommonHtmlEntities(text: string): string {
  return text
    .replace(/&#x27;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

/** Strips HTML tags so prose assertions survive auto-linked message rendering. */
export function stripHtmlTags(html: string): string {
  return decodeCommonHtmlEntities(html.replace(/<[^>]+>/g, ""));
}

/** Asserts visible copy is present regardless of internal doc link markup. */
export function expectHtmlToContainProse(html: string, text: string): void {
  expect(stripHtmlTags(html)).toContain(text);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extracts a glossary article region from shell or built-route HTML. */
export function extractGlossaryArticleHtml(
  html: string,
  registryId: string,
): string {
  const match = html.match(
    new RegExp(
      `<article[^>]*data-registry-id="${escapeRegExp(registryId)}"[^>]*>[\\s\\S]*?</article>`,
    ),
  );
  return match?.[0] ?? "";
}

/** Extracts glossary shell HTML before the registry article (robust for built RSC payloads). */
export function extractGlossaryShellHtml(
  html: string,
  registryId?: string,
): string {
  if (registryId) {
    const match = html.match(
      new RegExp(
        `<article[^>]*data-registry-id="${escapeRegExp(registryId)}"`,
        "i",
      ),
    );
    if (match?.index !== undefined && match.index >= 0) {
      return html.slice(0, match.index);
    }
  }

  const articleStart = html.indexOf("<article");
  return articleStart >= 0 ? html.slice(0, articleStart) : html;
}

/** Glossary MDX bodies must not repeat the shell DocsTitle as an in-body h1. */
export function expectGlossaryBodyOmitsTitleHeading(
  html: string,
  title: string,
): void {
  expect(html).not.toMatch(
    new RegExp(`<h1\\b[^>]*>\\s*${escapeRegExp(title)}\\s*</h1>`, "i"),
  );
}

/** Glossary article bodies must not repeat shell DocsDescription copy. */
export function expectGlossaryBodyOmitsShellDescription(
  html: string,
  description: string,
): void {
  expect(stripHtmlTags(html)).not.toContain(description);
}

/** Shell description prose auto-links use internal hrefs, marker, and focus ring utilities. */
export function expectGlossaryShellDescriptionAutoLink(
  html: string,
  options: { href: string; phrase?: string; registryId?: string },
): void {
  const shellHtml = extractGlossaryShellHtml(html, options.registryId);
  expect(shellHtml).toContain(`href="${options.href}"`);
  expect(shellHtml).toContain('data-prose-auto-link="true"');
  expect(shellHtml).toContain("focus-visible:ring-2");
  if (options.phrase) {
    expectHtmlToContainProse(shellHtml, options.phrase);
    expectGlossaryShellDescriptionAutoLinkPreservesPhrase(html, {
      href: options.href,
      phrase: options.phrase,
      registryId: options.registryId,
    });
  }
}

/** Shell description anchors keep the matched phrase as visible link text. */
export function expectGlossaryShellDescriptionAutoLinkPreservesPhrase(
  html: string,
  options: { href: string; phrase: string; registryId?: string },
): void {
  const shellHtml = extractGlossaryShellHtml(html, options.registryId);
  const anchorPattern = proseAutoLinkAnchorPattern(options.href);
  const match = shellHtml.match(anchorPattern);
  expect(match).not.toBeNull();
  expect(stripHtmlTags(match?.[0] ?? "")).toContain(options.phrase);
}

/** Shell region auto-links must use the shared prose contract (marker, focus ring, internal href). */
export function expectGlossaryShellAutoLinksUseProseContract(
  html: string,
  registryId?: string,
): void {
  const shellHtml = extractGlossaryShellHtml(html, registryId);
  const autoLinkTags = [
    ...shellHtml.matchAll(/<a\b[^>]*data-prose-auto-link="true"[^>]*>/g),
  ];

  for (const match of autoLinkTags) {
    const tag = match[0];
    expect(tag).toContain("focus-visible:ring-2");
    const hrefMatch = tag.match(/href="([^"]+)"/);
    expect(hrefMatch).not.toBeNull();
    const href = hrefMatch?.[1] ?? "";
    expect(href.startsWith("/docs/") || href.startsWith("/tags/")).toBe(true);
  }
}

/** Glossary pages must not render the retired opening-summary block. */
export function expectGlossaryOmitsOpeningSummary(html: string): void {
  expect(html).not.toContain('data-testid="glossary-opening"');
}

/** Shell-level contract: no rendered opening summary and optional auto-linked description anchors. */
export function expectGlossaryShellPresentationConvergence(
  html: string,
  options?: {
    registryId?: string;
    shellDescriptionAutoLinks?: Array<{ href: string; phrase?: string }>;
  },
): void {
  expectGlossaryOmitsOpeningSummary(html);
  for (const link of options?.shellDescriptionAutoLinks ?? []) {
    expectGlossaryShellDescriptionAutoLink(html, {
      ...link,
      registryId: options?.registryId,
    });
  }
}

/** Built glossary route HTML must omit pre-repair chrome and optional shell description auto-links. */
export function expectGlossaryBuiltRoutePresentationConvergence(
  html: string,
  options: {
    registryId: string;
    title: string;
    shellDescriptionAutoLinks?: Array<{ href: string; phrase?: string }>;
  },
): void {
  const articleHtml = extractGlossaryArticleHtml(html, options.registryId);

  expect(articleHtml.length).toBeGreaterThan(0);
  expectGlossaryOmitsOpeningSummary(html);
  expectGlossaryBodyOmitsTitleHeading(articleHtml, options.title);
  expect((articleHtml.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(
    1,
  );
  expectGlossaryOmitsWhereItAppears(articleHtml);

  if (options.shellDescriptionAutoLinks) {
    expectGlossaryShellPresentationConvergence(html, {
      registryId: options.registryId,
      shellDescriptionAutoLinks: options.shellDescriptionAutoLinks,
    });
  }
}

export function expectGlossaryOpeningSummaryMessage(messages: {
  openingSummary?: string;
}): void {
  expect(messages.openingSummary?.length).toBeGreaterThan(0);
}

/** Glossary pages must not render the removed where-it-appears section. */
export function expectGlossaryOmitsWhereItAppears(html: string): void {
  expect(html).not.toContain('id="where-it-appears"');
  expect(html).not.toContain("Where It Appears");
  expect(html).not.toContain('data-testid="derived-related-docs"');
}

/** Glossary pages render TagPillList once in the dedicated tags section. */
export function expectGlossarySingleTagPillList(html: string): void {
  expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
  expect(html).toContain('aria-label="Tags"');
  expect(html).toContain('id="tags"');
}

/** Asserts pre-repair duplicate-title, tag, and where-it-appears markers stay absent. */
export function expectGlossaryOmitsPreRepairPresentation(html: string): void {
  expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
  expectGlossaryOmitsOpeningSummary(html);
  expect(html).not.toContain('id="where-it-appears"');
  expect(html).not.toContain("Where It Appears");
  expect(html).not.toContain('data-testid="derived-related-docs"');
}

/** Full Phase 1 glossary presentation contract for a rendered token-style page. */
export function expectGlossaryPresentationConvergence(
  html: string,
  options: { title: string },
): void {
  expectGlossaryBodyOmitsTitleHeading(html, options.title);
  expectGlossaryOmitsOpeningSummary(html);
  expectGlossaryOmitsWhereItAppears(html);
  expectGlossarySingleTagPillList(html);
  expectGlossaryChromeLinksOmitUnderline(html);
  expectGlossaryOmitsPreRepairPresentation(html);
}

/** Non-prose glossary chrome links must not use underline utilities. */
export function expectGlossaryChromeLinksOmitUnderline(html: string): void {
  const tagPillList = extractElementHtml(html, 'data-testid="tag-pill-list"');
  const relatedDocs = extractElementHtml(
    html,
    'data-testid="curated-related-docs"',
  );

  for (const fragment of [tagPillList, relatedDocs]) {
    expect(fragment).toContain("no-underline");
    const withoutNoUnderline = fragment.replaceAll("no-underline", "");
    expect(withoutNoUnderline).not.toMatch(/\bunderline\b/);
    expect(fragment).toContain("focus-visible:ring-2");
  }
}

function extractElementHtml(html: string, marker: string): string {
  const markerIndex = html.indexOf(marker);
  expect(markerIndex).toBeGreaterThanOrEqual(0);
  let openUl = html.lastIndexOf("<ul", markerIndex);
  if (openUl < 0) {
    openUl = html.indexOf("<ul", markerIndex);
  }
  expect(openUl).toBeGreaterThanOrEqual(0);
  const closeUl = html.indexOf("</ul>", openUl);
  expect(closeUl).toBeGreaterThanOrEqual(0);
  return html.slice(openUl, closeUl + "</ul>".length);
}
