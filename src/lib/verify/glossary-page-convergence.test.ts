import { describe, expect, test } from "bun:test";
import { proseAutoLinkClassName } from "@/features/docs/components/prose-auto-link-class";
import {
  BATCH_013_GLOSSARY_CHECKS,
  BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_013_GLOSSARY_ROUTES,
} from "./batch-013-glossary-checks";
import {
  buildBatch013EmbeddingDescriptionLinksRow,
  buildBatch013GlossaryNoOpeningSummaryRow,
  buildBatch013GlossaryRouteConvergenceRows,
  buildBatch013HiddenSizeRouteRow,
  buildBatch013VectorRouteRow,
} from "./batch-013-glossary-page-convergence";
import {
  BATCH_013_ROUTE_CHECKS,
  BATCH_013_ROUTE_PATHS,
} from "./batch-013-route-checks";
import {
  GLOSSARY_EMBEDDING_REGISTRY_ID,
  GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
  GLOSSARY_TOKEN_REGISTRY_ID,
  GLOSSARY_VECTOR_REGISTRY_ID,
} from "./customer-ask-glossary-convergence";
import {
  assertGlossaryNoRenderedOpeningSummaryForRegistry,
  GLOSSARY_PAGE_CUSTOMER_ASK_REASONS,
  GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF,
  GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF,
} from "./customer-ask-glossary-page-convergence";
import {
  POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  POST_REPAIR_TOKEN_GLOSSARY_HTML,
  PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
  PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
} from "./customer-ask-glossary-page-convergence.test";
import {
  MISSING_PAGES_CUSTOMER_ASK_REASONS,
  MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID,
  MISSING_PAGES_VECTOR_REGISTRY_ID,
} from "./customer-ask-missing-pages-convergence";

const PROSE_AUTO_LINK_CLASS = `class="${proseAutoLinkClassName}"`;

export const POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML = `
  <html>
    <div id="nd-page">
      <h1>Vector</h1>
      <p>A numeric list that represents meaning in continuous space.</p>
      <article data-registry-id="${GLOSSARY_VECTOR_REGISTRY_ID}">
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

export const POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML = `
  <html>
    <div id="nd-page">
      <h1>Hidden Size</h1>
      <p>The width of vectors flowing through a transformer block.</p>
      <article data-registry-id="${GLOSSARY_HIDDEN_SIZE_REGISTRY_ID}">
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

export const PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML = `
  <html>
    <div id="nd-page">
      <h1>Vector</h1>
      <p>A numeric list that represents meaning in continuous space.</p>
      <article data-registry-id="${GLOSSARY_VECTOR_REGISTRY_ID}">
        <p data-testid="glossary-opening">Extra opening summary still renders.</p>
        <section id="what-it-is"><h2>What It Is</h2></section>
      </article>
    </div>
  </html>
`;

export const PRE_REPAIR_HIDDEN_SIZE_ROUTE_HTML = `
  <html><h1>Not Found</h1><p>Page missing</p></html>
`;

const POST_REPAIR_HTML_BY_ROUTE = {
  [BATCH_013_GLOSSARY_ROUTES.token]: POST_REPAIR_TOKEN_GLOSSARY_HTML,
  [BATCH_013_GLOSSARY_ROUTES.embedding]: POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
  [BATCH_013_GLOSSARY_ROUTES.vector]: POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
  [BATCH_013_GLOSSARY_ROUTES.hiddenSize]:
    POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
  [BATCH_013_ROUTE_PATHS.vectorGlossary]: `
    <html>
      <h1>Vector</h1>
      <article data-registry-id="${MISSING_PAGES_VECTOR_REGISTRY_ID}"></article>
    </html>
  `,
  [BATCH_013_ROUTE_PATHS.hiddenSizeGlossary]: `
    <html>
      <h1>Hidden Size</h1>
      <article data-registry-id="${MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID}"></article>
    </html>
  `,
} as const;

describe("assertGlossaryNoRenderedOpeningSummaryForRegistry", () => {
  test("passes for reopened glossary routes without opening-summary markers", () => {
    expect(
      assertGlossaryNoRenderedOpeningSummaryForRegistry(
        POST_REPAIR_TOKEN_GLOSSARY_HTML,
        GLOSSARY_TOKEN_REGISTRY_ID,
      ),
    ).toBeNull();
    expect(
      assertGlossaryNoRenderedOpeningSummaryForRegistry(
        POST_REPAIR_EMBEDDING_GLOSSARY_HTML,
        GLOSSARY_EMBEDDING_REGISTRY_ID,
      ),
    ).toBeNull();
    expect(
      assertGlossaryNoRenderedOpeningSummaryForRegistry(
        POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
        GLOSSARY_VECTOR_REGISTRY_ID,
      ),
    ).toBeNull();
    expect(
      assertGlossaryNoRenderedOpeningSummaryForRegistry(
        POST_REPAIR_HIDDEN_SIZE_GLOSSARY_OPENING_HTML,
        GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
      ),
    ).toBeNull();
  });

  test("fails with route-specific opening-summary evidence", () => {
    expect(
      assertGlossaryNoRenderedOpeningSummaryForRegistry(
        PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
        GLOSSARY_TOKEN_REGISTRY_ID,
      ),
    ).toBe(GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening);
    expect(
      assertGlossaryNoRenderedOpeningSummaryForRegistry(
        PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
        GLOSSARY_VECTOR_REGISTRY_ID,
      ),
    ).toBe(GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening);
  });
});

describe("buildBatch013GlossaryRouteConvergenceRows", () => {
  test("returns pass rows for post-repair glossary fixtures in inventory order", () => {
    const rows = buildBatch013GlossaryRouteConvergenceRows({
      htmlByRoute: POST_REPAIR_HTML_BY_ROUTE,
    });

    expect(rows).toHaveLength(7);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(rows.map((row) => row.checkId)).toEqual([
      ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES.map(
        () => BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
      ),
      BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
      BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
      BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
    ]);
    expect(rows.map((row) => row.route)).toEqual([
      ...BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
      BATCH_013_GLOSSARY_ROUTES.embedding,
      BATCH_013_ROUTE_PATHS.vectorGlossary,
      BATCH_013_ROUTE_PATHS.hiddenSizeGlossary,
    ]);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-glossary-page"),
    ).toBe(true);
  });

  test("returns fail rows with route and missing marker evidence", () => {
    const rows = buildBatch013GlossaryRouteConvergenceRows({
      htmlByRoute: {
        ...POST_REPAIR_HTML_BY_ROUTE,
        [BATCH_013_GLOSSARY_ROUTES.token]:
          PRE_REPAIR_TOKEN_GLOSSARY_OPENING_HTML,
        [BATCH_013_GLOSSARY_ROUTES.embedding]:
          PRE_REPAIR_EMBEDDING_GLOSSARY_PLAIN_DESCRIPTION_HTML,
        [BATCH_013_GLOSSARY_ROUTES.vector]:
          PRE_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
        [BATCH_013_ROUTE_PATHS.hiddenSizeGlossary]:
          PRE_REPAIR_HIDDEN_SIZE_ROUTE_HTML,
      },
    });

    const tokenOpeningRow = rows.find(
      (row) => row.route === BATCH_013_GLOSSARY_ROUTES.token,
    );
    const embeddingLinksRow = rows.find(
      (row) =>
        row.checkId ===
        BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
    );
    const vectorOpeningRow = rows.find(
      (row) =>
        row.route === BATCH_013_GLOSSARY_ROUTES.vector &&
        row.checkId ===
          BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    );
    const hiddenSizeRouteRow = rows.find(
      (row) => row.checkId === BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
    );

    expect(tokenOpeningRow?.status).toBe("fail");
    expect(tokenOpeningRow?.reason).toBe(
      GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening,
    );
    expect(embeddingLinksRow?.status).toBe("fail");
    expect(embeddingLinksRow?.reason).toBe(
      GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.missingEmbeddingVectorLink,
    );
    expect(vectorOpeningRow?.status).toBe("fail");
    expect(vectorOpeningRow?.reason).toBe(
      GLOSSARY_PAGE_CUSTOMER_ASK_REASONS.renderedGlossaryOpening,
    );
    expect(hiddenSizeRouteRow?.status).toBe("fail");
    expect(hiddenSizeRouteRow?.reason).toBe(
      MISSING_PAGES_CUSTOMER_ASK_REASONS.missingHiddenSizeTitle,
    );
  });
});

describe("batch-013 glossary row builders", () => {
  test("embedding description links require data-prose-auto-link targets", () => {
    const row = buildBatch013EmbeddingDescriptionLinksRow(`
      <html>
        <h1>Embedding</h1>
        <p>
          A
          <a href="${GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF}" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>dense vector</a>
          that represents a
          <a href="${GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF}" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token</a>.
        </p>
        <article data-registry-id="${GLOSSARY_EMBEDDING_REGISTRY_ID}"></article>
      </html>
    `);

    expect(row.status).toBe("pass");
    expect(row.checkId).toBe(
      BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
    );
  });

  test("vector and hidden-size route rows require reader-facing registry markers", () => {
    expect(
      buildBatch013VectorRouteRow(
        POST_REPAIR_HTML_BY_ROUTE[BATCH_013_ROUTE_PATHS.vectorGlossary],
      ).status,
    ).toBe("pass");
    expect(
      buildBatch013HiddenSizeRouteRow(
        POST_REPAIR_HTML_BY_ROUTE[BATCH_013_ROUTE_PATHS.hiddenSizeGlossary],
      ).status,
    ).toBe("pass");
    expect(
      buildBatch013GlossaryNoOpeningSummaryRow(
        POST_REPAIR_VECTOR_GLOSSARY_OPENING_HTML,
        BATCH_013_GLOSSARY_ROUTES.vector,
      ).status,
    ).toBe("pass");
  });
});
