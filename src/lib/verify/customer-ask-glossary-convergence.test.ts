import { describe, expect, test } from "bun:test";
import {
  assertGlossaryChromeLinksConvergence,
  assertGlossaryEmbeddingDescriptionLinks,
  assertGlossaryHiddenSizeDescriptionLinks,
  assertGlossaryPresentationConvergence,
  assertGlossaryVectorDescriptionLinks,
  buildCustomerAskGlossaryBridgeDescriptionRows,
  buildCustomerAskGlossaryRows,
  evaluateGlossaryFooterHoverRow,
  extractGlossaryTokenArticleHtml,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_REASONS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
  GLOSSARY_EMBEDDING_REGISTRY_ID,
  GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
  GLOSSARY_TOKEN_REGISTRY_ID,
  GLOSSARY_VECTOR_REGISTRY_ID,
} from "./customer-ask-glossary-convergence";

const CHROME_LINK_CLASS =
  'class="no-underline transition-colors hover:no-underline focus-visible:ring-2"';

const PROSE_AUTO_LINK_CLASS = CHROME_LINK_CLASS;

const POST_REPAIR_ARTICLE_HTML = `
  <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
    <section id="what-it-is"><h2>What It Is</h2></section>
    <section id="related">
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </section>
    <section id="tags">
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
      </ul>
    </section>
  </article>
`;

const FOOTER_CONTRACT_HTML = `
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
`;

const POST_REPAIR_SHELL_HTML = `
  <html>
    <div id="nd-page">
      <h1>Token</h1>
      ${POST_REPAIR_ARTICLE_HTML}
      ${FOOTER_CONTRACT_HTML}
    </div>
  </html>
`;

const PRE_REPAIR_DUPLICATE_TITLE_HTML = `
  <html>
    <h1>Token</h1>
    <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
      <h1>Token</h1>
      <p data-testid="glossary-opening">Summary</p>
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
      </ul>
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </article>
  </html>
`;

const PRE_REPAIR_DUPLICATE_TAGS_HTML = `
  <html>
    <h1>Token</h1>
    <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
      <p data-testid="glossary-opening">Summary</p>
      <ul data-testid="tag-pill-list" aria-label="Tags"><li><a ${CHROME_LINK_CLASS}>A</a></li></ul>
      <ul data-testid="tag-pill-list" aria-label="Tags"><li><a ${CHROME_LINK_CLASS}>B</a></li></ul>
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </article>
  </html>
`;

const PRE_REPAIR_WHERE_IT_APPEARS_HTML = `
  <html>
    <h1>Token</h1>
    <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
      <p data-testid="glossary-opening">Summary</p>
      <section id="where-it-appears"><h2>Where It Appears</h2></section>
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
      </ul>
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </article>
  </html>
`;

const PRE_REPAIR_PROBLEM_CORE_HTML = `
  <html>
    <h1>Token</h1>
    <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
      <section id="problem-statement"><h2>Problem Statement</h2></section>
      <section id="core-idea"><h2>Core Idea</h2></section>
      <p data-testid="glossary-opening">Summary</p>
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
      </ul>
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </article>
  </html>
`;

const PRE_REPAIR_UNDERLINE_HTML = `
  <html>
    <h1>Token</h1>
    <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
      <p data-testid="glossary-opening">Summary</p>
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" class="underline">Attention</a></li>
      </ul>
      <ul data-testid="curated-related-docs">
        <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
      </ul>
    </article>
  </html>
`;

describe("extractGlossaryTokenArticleHtml", () => {
  test("extracts the token article region from built HTML", () => {
    const article = extractGlossaryTokenArticleHtml(POST_REPAIR_SHELL_HTML);
    expect(article).toContain(
      `data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}"`,
    );
    expect(article).not.toContain('data-testid="glossary-opening"');
  });
});

describe("assertGlossaryPresentationConvergence", () => {
  test("passes on post-repair glossary token HTML", () => {
    expect(
      assertGlossaryPresentationConvergence(POST_REPAIR_SHELL_HTML),
    ).toBeNull();
  });

  test("fails on duplicate primary title", () => {
    expect(
      assertGlossaryPresentationConvergence(PRE_REPAIR_DUPLICATE_TITLE_HTML),
    ).toBe(GLOSSARY_CUSTOMER_ASK_REASONS.duplicatePrimaryTitle);
  });

  test("fails on duplicate tag pill lists", () => {
    expect(
      assertGlossaryPresentationConvergence(PRE_REPAIR_DUPLICATE_TAGS_HTML),
    ).toBe(GLOSSARY_CUSTOMER_ASK_REASONS.duplicateTagSurfaces);
  });

  test("fails when Where It Appears section remains", () => {
    expect(
      assertGlossaryPresentationConvergence(PRE_REPAIR_WHERE_IT_APPEARS_HTML),
    ).toBe(GLOSSARY_CUSTOMER_ASK_REASONS.whereItAppears);
  });

  test("fails when problem-statement and core-idea blocks remain", () => {
    expect(
      assertGlossaryPresentationConvergence(PRE_REPAIR_PROBLEM_CORE_HTML),
    ).toBe(GLOSSARY_CUSTOMER_ASK_REASONS.problemCoreBlocks);
  });

  test("fails when rendered glossary opening summary remains", () => {
    expect(
      assertGlossaryPresentationConvergence(`
        <html>
          <h1>Token</h1>
          <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
            <p data-testid="glossary-opening">Summary</p>
            <ul data-testid="tag-pill-list" aria-label="Tags">
              <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
            </ul>
            <ul data-testid="curated-related-docs">
              <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
            </ul>
          </article>
        </html>
      `),
    ).toBe(GLOSSARY_CUSTOMER_ASK_REASONS.renderedOpeningSummary);
  });
});

describe("assertGlossaryChromeLinksConvergence", () => {
  test("passes when tag and related-doc chrome links use no-underline", () => {
    expect(
      assertGlossaryChromeLinksConvergence(POST_REPAIR_SHELL_HTML),
    ).toBeNull();
  });

  test("fails when tag chrome links use underline utilities", () => {
    expect(
      assertGlossaryChromeLinksConvergence(PRE_REPAIR_UNDERLINE_HTML),
    ).toBe(GLOSSARY_CUSTOMER_ASK_REASONS.chromeUnderline);
  });
});

describe("evaluateGlossaryFooterHoverRow", () => {
  test("passes when footer cards match the shared footer chrome contract", () => {
    const row = evaluateGlossaryFooterHoverRow(POST_REPAIR_SHELL_HTML);
    expect(row.status).toBe("pass");
    expect(row.checkId).toBe(GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId);
    expect(row.route).toBe(GLOSSARY_CUSTOMER_ASK_ROUTE);
  });

  test("reports fail when footer navigation exists but contract markers are missing", () => {
    const html = `
      <div id="nd-page">
        <a href="/docs/glossary/embedding"><span>Previous</span><p>Embedding</p></a>
        <p class="text-fd-muted-foreground truncate">Next Page</p>
      </div>
    `;
    const row = evaluateGlossaryFooterHoverRow(html);
    expect(row.status).toBe("fail");
    expect(row.reason).toContain("Previous Page");
  });

  test("reports uncertain when footer navigation is absent", () => {
    const html = `
      <html>
        <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
          <p data-testid="glossary-opening">Summary</p>
        </article>
      </html>
    `;
    const row = evaluateGlossaryFooterHoverRow(html);
    expect(row.status).toBe("uncertain");
    expect(row.reason).toContain("footer previous/next navigation not found");
  });
});

describe("buildCustomerAskGlossaryRows", () => {
  test("returns all pass rows for post-repair glossary HTML", () => {
    const rows = buildCustomerAskGlossaryRows(POST_REPAIR_SHELL_HTML);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
    expect(
      rows.every((row) => row.checklistRow === "phase-1-glossary-page"),
    ).toBe(true);
  });

  test("fails presentation and chrome link checks independently", () => {
    const presentationRows = buildCustomerAskGlossaryRows(
      PRE_REPAIR_WHERE_IT_APPEARS_HTML,
    );
    const presentationRow = presentationRows.find(
      (row) =>
        row.checkId === GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
    );
    expect(presentationRow?.status).toBe("fail");
    expect(presentationRow?.reason).toBe(
      GLOSSARY_CUSTOMER_ASK_REASONS.whereItAppears,
    );

    const chromeRows = buildCustomerAskGlossaryRows(PRE_REPAIR_UNDERLINE_HTML);
    const chromeRow = chromeRows.find(
      (row) => row.checkId === GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
    );
    expect(chromeRow?.status).toBe("fail");
    expect(chromeRow?.reason).toBe(
      GLOSSARY_CUSTOMER_ASK_REASONS.chromeUnderline,
    );
  });
});

const POST_REPAIR_EMBEDDING_SHELL_HTML = `
  <html>
    <h1>Embedding</h1>
    <p class="mb-8 text-lg text-fd-muted-foreground">
      A <a href="/docs/glossary/vector" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>dense vector</a> that represents a <a href="/docs/glossary/token" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token</a> or other discrete item so the model can run continuous math on it.
    </p>
    <article data-registry-id="${GLOSSARY_EMBEDDING_REGISTRY_ID}">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

const POST_REPAIR_VECTOR_SHELL_HTML = `
  <html>
    <h1>Vector</h1>
    <p class="mb-8 text-lg text-fd-muted-foreground">
      An ordered list of numbers that represents a point or direction in continuous space—<a href="/docs/glossary/embedding" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>embeddings</a> and activations are vectors at different stages of the model.
    </p>
    <article data-registry-id="${GLOSSARY_VECTOR_REGISTRY_ID}">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

const POST_REPAIR_HIDDEN_SIZE_SHELL_HTML = `
  <html>
    <h1>Hidden Size</h1>
    <p class="mb-8 text-lg text-fd-muted-foreground">
      The width of a model's internal <a href="/docs/glossary/vector" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>vectors</a>—the number of dimensions in each <a href="/docs/glossary/embedding" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token embedding</a> and each <a href="/docs/glossary/token" data-prose-auto-link="true" ${PROSE_AUTO_LINK_CLASS}>token</a>'s per-position hidden state before the vocabulary projection.
    </p>
    <article data-registry-id="${GLOSSARY_HIDDEN_SIZE_REGISTRY_ID}">
      <section id="what-it-is"><h2>What It Is</h2></section>
    </article>
  </html>
`;

describe("assertGlossaryEmbeddingDescriptionLinks", () => {
  test("passes when embedding shell description links vector and token", () => {
    expect(
      assertGlossaryEmbeddingDescriptionLinks(POST_REPAIR_EMBEDDING_SHELL_HTML),
    ).toBeNull();
  });

  test("fails when embedding shell description is missing vector link", () => {
    const html = POST_REPAIR_EMBEDDING_SHELL_HTML.replace(
      'href="/docs/glossary/vector"',
      'href="/docs/glossary/missing"',
    );
    expect(assertGlossaryEmbeddingDescriptionLinks(html)).toContain(
      "/docs/glossary/vector",
    );
  });

  test("fails when rendered opening summary remains on embedding route", () => {
    const html = POST_REPAIR_EMBEDDING_SHELL_HTML.replace(
      "<h1>Embedding</h1>",
      '<h1>Embedding</h1><p data-testid="glossary-opening">Summary</p>',
    );
    expect(assertGlossaryEmbeddingDescriptionLinks(html)).toBe(
      GLOSSARY_CUSTOMER_ASK_REASONS.renderedOpeningSummary,
    );
  });
});

describe("assertGlossaryVectorDescriptionLinks", () => {
  test("passes when vector shell description links embedding", () => {
    expect(
      assertGlossaryVectorDescriptionLinks(POST_REPAIR_VECTOR_SHELL_HTML),
    ).toBeNull();
  });

  test("fails when vector shell description is missing embedding link", () => {
    const html = POST_REPAIR_VECTOR_SHELL_HTML.replace(
      'href="/docs/glossary/embedding"',
      "",
    );
    expect(assertGlossaryVectorDescriptionLinks(html)).toContain(
      "/docs/glossary/embedding",
    );
  });
});

describe("assertGlossaryHiddenSizeDescriptionLinks", () => {
  test("passes when hidden-size shell description links embedding and vector", () => {
    expect(
      assertGlossaryHiddenSizeDescriptionLinks(
        POST_REPAIR_HIDDEN_SIZE_SHELL_HTML,
      ),
    ).toBeNull();
  });

  test("fails when hidden-size shell description is missing vector link", () => {
    const html = POST_REPAIR_HIDDEN_SIZE_SHELL_HTML.replace(
      'href="/docs/glossary/vector"',
      "",
    );
    expect(assertGlossaryHiddenSizeDescriptionLinks(html)).toContain(
      "/docs/glossary/vector",
    );
  });
});

describe("buildCustomerAskGlossaryBridgeDescriptionRows", () => {
  test("returns pass rows for bridge glossary shell description links", () => {
    const rows = buildCustomerAskGlossaryBridgeDescriptionRows({
      embeddingHtml: POST_REPAIR_EMBEDDING_SHELL_HTML,
      vectorHtml: POST_REPAIR_VECTOR_SHELL_HTML,
      hiddenSizeHtml: POST_REPAIR_HIDDEN_SIZE_SHELL_HTML,
    });

    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      GLOSSARY_CUSTOMER_ASK_CHECKS.embeddingDescriptionLinks.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.vectorDescriptionLinks.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.hiddenSizeDescriptionLinks.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });
});
