/**
 * BERT paper discovery slice proof for search and tag-landing behavior.
 * Routine registry alignment for the paper bundle is covered by
 * `make validate-data`; this file proves observable search routing and tag
 * landing links driven by registry-backed aliases and tags.
 */
import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const PAPER_SLUG = "bert-pre-training-of-deep-bidirectional-transformers";
const PAPER_URL = `/docs/papers/${PAPER_SLUG}`;

describe("BERT paper discovery surfaces", () => {
  test("search documents carry canonical aliases, tags, and opening summary text", async () => {
    const registry = await loadRegistry();
    const pages = await loadPublishedDocsPages("en");
    const document = buildSearchDocuments(pages, registry).find(
      (entry) => entry.url === PAPER_URL,
    );

    expect(document?.aliases).toEqual(
      expect.arrayContaining([
        "BERT",
        "BERT paper",
        "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
      ]),
    );
    expect(document?.tags).toEqual(
      expect.arrayContaining(["foundations", "attention", "tokenization"]),
    );
    expect(document?.bodyText).toContain(
      "deep bidirectional transformer encoders trained with masked language modeling",
    );
  });

  test.each([
    "BERT",
    "BERT paper",
    "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
  ])("search routes %s to the canonical BERT paper page", async (query) => {
    const results = await docsSearchApi.search(query);
    expect(results.length).toBeGreaterThan(0);
    expect(results[0]?.url).toBe(PAPER_URL);
  });

  test("tokenization tag landing lists the BERT paper and renders a navigable link", async () => {
    const messages = await loadUiMessages();
    const groups = await loadTagResourceGroups("tokenization", messages, "en");
    const paperGroup = groups.find((group) => group.kind === "paper");

    expect(paperGroup?.resources).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "paper",
          slug: PAPER_SLUG,
          title: "BERT Paper",
          url: PAPER_URL,
        }),
      ]),
    );

    const page = await TagLandingPage({
      params: Promise.resolve({ slug: "tokenization" }),
    });
    const html = renderToStaticMarkup(page);

    expect(html).toContain("BERT Paper");
    expect(html).toContain(`href="${PAPER_URL}"`);
    expect(html).toContain('href="/search?tag=tokenization"');
    expect(html).not.toContain("No resources");
  });
});
