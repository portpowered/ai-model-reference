import { describe, expect, test } from "bun:test";
import {
  assertGlossaryChromeLinksConvergence,
  assertGlossaryPresentationConvergence,
  buildCustomerAskGlossaryRows,
  evaluateGlossaryFooterHoverRow,
  extractGlossaryTokenArticleHtml,
  GLOSSARY_CUSTOMER_ASK_CHECKS,
  GLOSSARY_CUSTOMER_ASK_REASONS,
  GLOSSARY_CUSTOMER_ASK_ROUTE,
  GLOSSARY_TOKEN_REGISTRY_ID,
} from "./customer-ask-glossary-convergence";

const CHROME_LINK_CLASS =
  'class="no-underline transition-colors hover:no-underline focus-visible:ring-2"';

const POST_REPAIR_ARTICLE_HTML = `
  <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
    <p data-testid="glossary-opening">Models use a fixed tokenizer vocabulary.</p>
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

const POST_REPAIR_SHELL_HTML = `
  <html>
    <div id="nd-page">
      <h1>Token</h1>
      ${POST_REPAIR_ARTICLE_HTML}
      <a class="hover:text-fd-accent-foreground" href="/docs/glossary/embedding">
        <span>Previous</span>
        <p class="text-fd-muted-foreground">Embedding</p>
      </a>
      <link rel="stylesheet" href="/_next/static/css/docs-page-footer-chrome.css" />
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
    expect(article).toContain('data-testid="glossary-opening"');
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
  test("passes when footer hover chrome markers are present", () => {
    const row = evaluateGlossaryFooterHoverRow(POST_REPAIR_SHELL_HTML);
    expect(row.status).toBe("pass");
    expect(row.checkId).toBe(GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId);
    expect(row.route).toBe(GLOSSARY_CUSTOMER_ASK_ROUTE);
  });

  test("reports uncertain when footer hover pairing is not detectable", () => {
    const html = `
      <div id="nd-page">
        <a href="/docs/glossary/embedding"><span>Previous</span><p>Embedding</p></a>
      </div>
    `;
    const row = evaluateGlossaryFooterHoverRow(html);
    expect(row.status).toBe("uncertain");
    expect(row.reason).toContain("not observable");
  });
});

describe("buildCustomerAskGlossaryRows", () => {
  test("returns pass and uncertain rows for post-repair glossary HTML", () => {
    const rows = buildCustomerAskGlossaryRows(POST_REPAIR_SHELL_HTML);
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
    ]);
    expect(
      rows
        .filter(
          (row) =>
            row.checkId !== GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
        )
        .every((row) => row.status === "pass"),
    ).toBe(true);
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
