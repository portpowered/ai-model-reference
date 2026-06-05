import { describe, expect, test } from "bun:test";
import {
  buildCustomerAskDocsFooterRows,
  DOCS_FOOTER_CUSTOMER_ASK_CHECKS,
  DOCS_FOOTER_CUSTOMER_ASK_ROUTE,
  evaluateDocsFooterHoverFocusParityRow,
} from "./customer-ask-docs-footer-convergence";

const PASSING_BUNDLED_FOOTER_CSS = `
  #nd-page a[class*=hover\\:bg-fd-accent][class*=hover\\:text-fd-accent-foreground]:is(:hover,:focus-visible)>p.text-fd-muted-foreground{color:inherit}
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
      ${FOOTER_CONTRACT_HTML}
    </div>
  </html>
`;

describe("evaluateDocsFooterHoverFocusParityRow", () => {
  test("passes when bundled CSS satisfies the footer sublabel inherit contract", () => {
    const row = evaluateDocsFooterHoverFocusParityRow(
      POST_REPAIR_SHELL_HTML,
      PASSING_BUNDLED_FOOTER_CSS,
    );

    expect(row.status).toBe("pass");
    expect(row.checkId).toBe(
      DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
    );
    expect(row.route).toBe(DOCS_FOOTER_CUSTOMER_ASK_ROUTE);
    expect(row.checklistRow).toBe("phase-1-docs-footer");
  });

  test("fails when bundled CSS lacks the hover/focus inherit rule pairing", () => {
    const row = evaluateDocsFooterHoverFocusParityRow(
      POST_REPAIR_SHELL_HTML,
      "#nd-page a[class*=hover\\:text-fd-accent-foreground]:hover>p.text-fd-muted-foreground{color:var(--color-fd-muted-foreground)}",
    );

    expect(row.status).toBe("fail");
    expect(row.reason).toContain("missing footer sublabel hover/focus inherit");
  });

  test("reports uncertain when footer navigation exists but bundled CSS is unavailable", () => {
    const row = evaluateDocsFooterHoverFocusParityRow(
      POST_REPAIR_SHELL_HTML,
      null,
    );

    expect(row.status).toBe("uncertain");
    expect(row.reason).toContain("bundled app CSS artifacts unavailable");
  });

  test("reports uncertain when footer navigation is absent", () => {
    const row = evaluateDocsFooterHoverFocusParityRow(
      "<html><article><p>Token</p></article></html>",
      PASSING_BUNDLED_FOOTER_CSS,
    );

    expect(row.status).toBe("uncertain");
    expect(row.reason).toContain("footer previous/next navigation not found");
  });

  test("reports uncertain when footer navigation exists but chrome contract is not observable", () => {
    const html = `
      <div id="nd-page">
        <a href="/docs/glossary/embedding"><span>Previous</span><p>Embedding</p></a>
        <p class="text-fd-muted-foreground truncate">Next Page</p>
      </div>
    `;
    const row = evaluateDocsFooterHoverFocusParityRow(
      html,
      PASSING_BUNDLED_FOOTER_CSS,
    );

    expect(row.status).toBe("uncertain");
    expect(row.reason).toContain("hover/focus parity not observable");
    expect(row.reason).toContain("Previous Page");
  });
});

describe("buildCustomerAskDocsFooterRows", () => {
  test("returns a single pass row for post-repair HTML and bundled CSS", () => {
    const rows = buildCustomerAskDocsFooterRows(
      POST_REPAIR_SHELL_HTML,
      PASSING_BUNDLED_FOOTER_CSS,
    );

    expect(rows).toHaveLength(1);
    expect(rows[0]?.status).toBe("pass");
    expect(rows[0]?.checkId).toBe(
      DOCS_FOOTER_CUSTOMER_ASK_CHECKS.hoverFocusParity.checkId,
    );
  });
});
