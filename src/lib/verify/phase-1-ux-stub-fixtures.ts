import { TOKEN_GLOSSARY_URL } from "@/lib/navigation/docs-sidebar-contract";
import { DOCS_SHELL_CONVERGENCE_ROUTES } from "./docs-shell-convergence-http";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import {
  ATTENTION_TAG_LANDING_PATH,
  ATTENTION_TAG_SCOPED_SEARCH_URL,
} from "./tags-navigation-convergence";

const UNIFIED_DOCS_SHELL = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <div id="nd-sidebar">
    <span>Modules</span>
    <span>Glossary</span>
    <a href="${TOKEN_GLOSSARY_URL}">Token</a>
  </div>
  <div id="nd-page"><article>__BODY__</article></div>
`;

const HEADER_SEARCH_TRIGGER =
  '<button data-search="" aria-label="Open search">Search</button>';

const PRIMARY_NAV = '<nav aria-label="Primary">Model Atlas</nav>';

export const PHASE_1_UX_PASSING_HOME_HTML = `
  <html>
    <header>
      ${PRIMARY_NAV}
      ${HEADER_SEARCH_TRIGGER}
    </header>
    <main>
      <article>
        <header class="relative overflow-hidden rounded-lg px-6 py-10">
          <h1>Model Atlas</h1>
          <p>Reference</p>
        </header>
        <p>Model Atlas intro without inline search handoff.</p>
        <section id="browse" aria-labelledby="home-browse-heading">
          <h2 id="home-browse-heading">Browse</h2>
          <ul class="mt-4 flex list-none flex-col gap-3" aria-label="Browse">
            <li>
              <a href="/tags" class="no-underline hover:no-underline">Tags</a>
            </li>
          </ul>
        </section>
      </article>
    </main>
  </html>
`;

export function buildPhase1DocsRouteStubHtml(body: string): string {
  return `<html>${UNIFIED_DOCS_SHELL.replace("__BODY__", body)}</html>`;
}

function docsRouteHtml(body: string): string {
  return buildPhase1DocsRouteStubHtml(body);
}

/** Stub HTML that satisfies Phase 1 UX convergence and route content checks. */
export const PHASE_1_UX_PASSING_STUB_HTML: Record<string, string> = {
  "/": PHASE_1_UX_PASSING_HOME_HTML,
  "/search": "<html><h1>Search</h1><p>Search Model Atlas</p></html>",
  "/docs/architecture": docsRouteHtml("<h1>Architecture</h1><p>Token</p>"),
  "/docs/glossary": docsRouteHtml("<h1>Glossary</h1><p>Token</p>"),
  "/docs/glossary/token": docsRouteHtml(
    '<h1>Token</h1><div data-registry-id="concept.token"></div>',
  ),
  "/docs/modules/grouped-query-attention": docsRouteHtml(
    buildGroupedQueryAttentionStubBody(),
  ),
  "/tags": `<html><header>${PRIMARY_NAV}</header><h1>Tags</h1><a href="/tags/attention">Attention</a></html>`,
  [ATTENTION_TAG_LANDING_PATH]: `<html><header>${PRIMARY_NAV}</header><h1>Attention</h1><a href="/docs/modules/grouped-query-attention">GQA</a><a href="${TOKEN_GLOSSARY_URL}">Token</a><a href="${ATTENTION_TAG_SCOPED_SEARCH_URL}">Search</a></html>`,
};

export function phase1UxPassingDocsShellHtmlByPath(): Record<string, string> {
  return Object.fromEntries(
    DOCS_SHELL_CONVERGENCE_ROUTES.map((route) => [
      route.path,
      PHASE_1_UX_PASSING_STUB_HTML[route.path] ?? "<html>not found</html>",
    ]),
  );
}
