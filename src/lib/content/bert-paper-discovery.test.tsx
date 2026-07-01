import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import TagLandingPage from "@/app/(site)/tags/[slug]/page";
import { resolveCitations } from "@/lib/content/citations";
import { getGraphById } from "@/lib/content/graph-registry-runtime";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadPaperPage } from "@/lib/content/paper-page";
import { loadRegistry } from "@/lib/content/registry";
import { getPaperById } from "@/lib/content/registry-runtime";
import { loadTagResourceGroups } from "@/lib/content/tag-resources";
import { loadUiMessages } from "@/lib/content/ui-messages";
import { buildSearchDocuments } from "@/lib/search/build-documents";
import { docsSearchApi } from "@/lib/search/search-server";

const PAPER_SLUG = "bert-pre-training-of-deep-bidirectional-transformers";
const PAPER_URL = `/docs/papers/${PAPER_SLUG}`;
const PAPER_REGISTRY_ID =
  "paper.bert-pre-training-of-deep-bidirectional-transformers";
const CONTRIBUTION_GRAPH_ID = "graph.bert-pre-training-contribution";

describe("BERT paper discovery surfaces (bert-paper-page-005)", () => {
  test("keeps the route, registry record, citation, english messages, tags, and assets aligned", async () => {
    const page = await loadPaperPage(PAPER_SLUG);
    const record = getPaperById(PAPER_REGISTRY_ID);
    if (!record) {
      throw new Error(`expected ${PAPER_REGISTRY_ID} in registry`);
    }

    expect(page.frontmatter.registryId).toBe(record.id);
    expect(page.frontmatter.tags).toEqual(record.tags);
    expect(page.messages.title).toBe("BERT Paper");
    expect(page.messages.openingSummary).toContain(
      "BERT: Pre-training of Deep Bidirectional Transformers for Language Understanding",
    );
    expect(page.messages.assets?.contributionGraph?.alt).toContain(
      "WordPiece inputs",
    );
    expect(page.messages.assets?.contributionGraph?.caption).toContain(
      "masked language modeling pretraining",
    );

    const citations = resolveCitations(record.citationIds);
    expect(citations).toHaveLength(1);
    expect(citations[0]?.id).toBe(
      "citation.bert-pre-training-of-deep-bidirectional-transformers",
    );

    const asset = page.assets.contributionGraph;
    expect(asset?.type).toBe("graph");
    if (asset?.type !== "graph") {
      throw new Error("expected contributionGraph asset to be a graph");
    }
    expect(asset.graphId).toBe(CONTRIBUTION_GRAPH_ID);
    expect(getGraphById(CONTRIBUTION_GRAPH_ID)?.subjectId).toBe(
      PAPER_REGISTRY_ID,
    );
  });

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
