import { describe, expect, test } from "bun:test";
import { proseAutoLinkClassName } from "@/features/docs/components/prose-auto-link-class";
import { BATCH_012_GLOSSARY_CHECKS } from "./batch-012-glossary-checks";
import {
  assertEmbeddingDescriptionLinks,
  assertGlossaryNoRenderedOpeningSummary,
  buildCustomerAskEmbeddingDescriptionLinksRow,
  buildCustomerAskGlossaryNoOpeningSummaryRow,
  GLOSSARY_PAGE_CUSTOMER_ASK_REASONS,
  GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID,
  GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF,
  GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF,
  GLOSSARY_PAGE_TOKEN_REGISTRY_ID,
} from "./customer-ask-glossary-page-convergence";

const PROSE_AUTO_LINK_CLASS = `class="${proseAutoLinkClassName}"`;

export const POST_REPAIR_TOKEN_GLOSSARY_HTML = `
  <html>
    <div id="nd-page">
      <h1>Token</h1>
      <p>The smallest unit of text a language model reads and predicts.</p>
      <article data-registry-id="${GLOSSARY_PAGE_TOKEN_REGISTRY_ID}">
        <section id="what-it-is"><h2>What It Is</h2></section>
        <ul data-testid="tag-pill-list" aria-label="Tags">
          <li><a href="/tags/attention">Attention</a></li>
        </ul>
      </article>
    </div>
  </html>
`;

export const PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML = `
  <html>
    <div id="nd-page">
      <h1>Token</h1>
      <p>The smallest unit of text a language model reads and predicts.</p>
      <article data-registry-id="${GLOSSARY_PAGE_TOKEN_REGISTRY_ID}">
        <p data-testid="glossary-opening">Models use a fixed tokenizer vocabulary.</p>
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

export const PRE_REPAIR_TOKEN_GLOSSARY_ARTICLE_OPENING_SUMMARY_HTML = `
  <html>
    <div id="nd-page">
      <h1>Token</h1>
      <p>The smallest unit of text a language model reads and predicts.</p>
      <article data-registry-id="${GLOSSARY_PAGE_TOKEN_REGISTRY_ID}">
        <section id="opening-summary"><p>Separate opening summary block.</p></section>
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

export const POST_REPAIR_EMBEDDING_GLOSSARY_HTML = `
  <html>
    <div id="nd-page">
      <h1>Embedding</h1>
      <p>
        A
        <a href="${GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF}" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>dense vector</a>
        that represents a
        <a href="${GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF}" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token</a>
        or other discrete item so the model can run continuous math on it.
      </p>
      <article data-registry-id="${GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID}">
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

export const PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML = `
  <html>
    <div id="nd-page">
      <h1>Embedding</h1>
      <p>A dense vector that represents a token or other discrete item so the model can run continuous math on it.</p>
      <article data-registry-id="${GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID}">
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

describe("assertGlossaryNoRenderedOpeningSummary", () => {
  test("passes when glossary token HTML omits rendered opening summary blocks", () => {
    expect(
      assertGlossaryNoRenderedOpeningSummary(POST_REPAIR_TOKEN_GLOSSARY_HTML),
    ).toBeNull();
  });

  test("fails when GlossaryOpening output remains in built HTML", () => {
    expect(
      assertGlossaryNoRenderedOpeningSummary(
        PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
      ),
    ).toBe(GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening);
  });

  test("fails when a distinct openingSummary block remains inside the article", () => {
    expect(
      assertGlossaryNoRenderedOpeningSummary(
        PRE_REPAIR_TOKEN_GLOSSARY_ARTICLE_OPENING_SUMMARY_HTML,
      ),
    ).toBe(GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedOpeningSummaryInArticle);
  });
});

describe("assertEmbeddingDescriptionLinks", () => {
  test("passes when embedding shell description auto-links vector and token", () => {
    expect(
      assertEmbeddingDescriptionLinks(POST_REPAIR_EMBEDDING_GLOSSARY_HTML),
    ).toBeNull();
  });

  test("fails when embedding description keeps plain text without resolved links", () => {
    expect(
      assertEmbeddingDescriptionLinks(
        PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
      ),
    ).toBe(GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingVectorLink);
  });

  test("fails when vector link is present but token link is missing", () => {
    const html = `
      <html>
        <h1>Embedding</h1>
        <p>
          A
          <a href="${GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF}" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>dense vector</a>
          that represents a token.
        </p>
        <article data-registry-id="${GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID}"></article>
      </html>
    `;
    expect(assertEmbeddingDescriptionLinks(html)).toBe(
      GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingTokenLink,
    );
  });
});

describe("buildCustomerAskGlossaryPageRows", () => {
  test("returns pass rows for post-repair glossary fixtures", () => {
    const openingRow = buildCustomerAskGlossaryNoOpeningSummaryRow(
      POST_REPAIR_TOKEN_GLOSSARY_HTML,
    );
    const embeddingRow = buildCustomerAskEmbeddingDescriptionLinksRow(
      POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
    );

    expect(openingRow.status).toBe("pass");
    expect(openingRow.checkId).toBe(
      BATCH_012_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    );
    expect(openingRow.checklistRow).toBe("phase-1-glossary-page");

    expect(embeddingRow.status).toBe("pass");
    expect(embeddingRow.checkId).toBe(
      BATCH_012_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
    );
    expect(embeddingRow.checklistRow).toBe("phase-1-glossary-page");
  });

  test("returns fail rows for pre-repair glossary fixtures", () => {
    const openingRow = buildCustomerAskGlossaryNoOpeningSummaryRow(
      PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
    );
    const embeddingRow = buildCustomerAskEmbeddingDescriptionLinksRow(
      PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
    );

    expect(openingRow.status).toBe("fail");
    expect(embeddingRow.status).toBe("fail");
  });
});
