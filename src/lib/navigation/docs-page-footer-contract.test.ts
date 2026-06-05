import { describe, expect, test } from "bun:test";
import {
  extractFooterCardAnchorHtml,
  extractNdPageHtml,
  FOOTER_DIRECTIONAL_SUBLABELS,
  footerCardHasAccentHoverClasses,
  footerCardHasMutedDirectionalSublabel,
} from "@/lib/navigation/docs-page-footer-contract";

const SAMPLE_ND_PAGE_HTML = `
<div id="nd-page">
  <article>Token glossary body</article>
  <div class="@container grid gap-4 grid-cols-2">
    <a class="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground" href="/docs/glossary/scaling-law">
      <div class="inline-flex items-center gap-1.5 font-medium"><p>Scaling Law</p></div>
      <p class="text-fd-muted-foreground truncate">Previous Page</p>
    </a>
    <a class="flex flex-col gap-2 rounded-lg border p-4 text-sm transition-colors hover:bg-fd-accent/80 hover:text-fd-accent-foreground text-end" href="/docs/glossary/embedding">
      <div class="inline-flex items-center gap-1.5 font-medium flex-row-reverse"><p>Embedding</p></div>
      <p class="text-fd-muted-foreground truncate">Next Page</p>
    </a>
  </div>
</div>
<div id="nd-toc"></div>
`;

describe("docs page footer contract", () => {
  test("extractNdPageHtml scopes to the main page region before nd-toc", () => {
    const ndPage = extractNdPageHtml(SAMPLE_ND_PAGE_HTML);
    expect(ndPage).toContain('id="nd-page"');
    expect(ndPage).toContain("Previous Page");
    expect(ndPage).toContain("Next Page");
    expect(ndPage).not.toContain('id="nd-toc"');
  });

  test("extractFooterCardAnchorHtml returns accent-hover anchors for both directions", () => {
    const ndPage = extractNdPageHtml(SAMPLE_ND_PAGE_HTML);

    const previousCard = extractFooterCardAnchorHtml(
      ndPage,
      FOOTER_DIRECTIONAL_SUBLABELS.previous,
    );
    const nextCard = extractFooterCardAnchorHtml(
      ndPage,
      FOOTER_DIRECTIONAL_SUBLABELS.next,
    );

    expect(previousCard).toContain("hover:bg-fd-accent");
    expect(previousCard).toContain("hover:text-fd-accent-foreground");
    expect(previousCard).toContain("Previous Page");

    expect(nextCard).toContain("hover:bg-fd-accent");
    expect(nextCard).toContain("hover:text-fd-accent-foreground");
    expect(nextCard).toContain("Next Page");
  });

  test("footer card helpers detect accent-hover classes and muted sublabels", () => {
    const ndPage = extractNdPageHtml(SAMPLE_ND_PAGE_HTML);
    const previousCard = extractFooterCardAnchorHtml(
      ndPage,
      FOOTER_DIRECTIONAL_SUBLABELS.previous,
    );

    expect(footerCardHasAccentHoverClasses(previousCard)).toBe(true);
    expect(
      footerCardHasMutedDirectionalSublabel(
        previousCard,
        FOOTER_DIRECTIONAL_SUBLABELS.previous,
      ),
    ).toBe(true);
  });
});
