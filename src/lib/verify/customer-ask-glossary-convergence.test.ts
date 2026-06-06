import { describe, expect, test } from "bun:test";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
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

describe("buildCustomerAskGlossaryRows (built HTML)", () => {
  test("/docs/glossary/token built HTML reports pass for all customer-ask glossary checks", () => {
    const builtPath = join(
      process.cwd(),
      ".next/server/app/docs/glossary/token.html",
    );
    if (!existsSync(builtPath)) {
      return;
    }

    const rows = buildCustomerAskGlossaryRows(readFileSync(builtPath, "utf8"));
    expect(rows).toHaveLength(3);
    expect(rows.map((row) => row.checkId)).toEqual([
      GLOSSARY_CUSTOMER_ASK_CHECKS.presentation.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.chromeLinks.checkId,
      GLOSSARY_CUSTOMER_ASK_CHECKS.footerHover.checkId,
    ]);
    expect(rows.every((row) => row.status === "pass")).toBe(true);
  });
});
