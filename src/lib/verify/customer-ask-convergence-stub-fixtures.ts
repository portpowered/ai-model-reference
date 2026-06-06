import { TOKEN_GLOSSARY_URL } from "@/lib/navigation/docs-sidebar-contract";
import { GLOSSARY_TOKEN_REGISTRY_ID } from "./customer-ask-glossary-convergence";
import { GQA_MODULE_REGISTRY_ID } from "./customer-ask-gqa-module-convergence";
import { TAG_LIST_CUSTOMER_ASK_ROUTES } from "./customer-ask-tag-list-convergence";
import { buildGroupedQueryAttentionStubBody } from "./grouped-query-attention-module-convergence";
import { REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE } from "./home-search-entry-convergence";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_GROUPED_QUERY_ATTENTION_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "./phase-1-search-checks";
import {
  buildPhase1DocsRouteStubHtml,
  PHASE_1_UX_PASSING_STUB_HTML,
} from "./phase-1-ux-stub-fixtures";
import { ATTENTION_TAG_SCOPED_SEARCH_URL } from "./tags-navigation-convergence";

const PRIMARY_NAV = '<nav aria-label="Primary">Model Atlas</nav>';

const CHROME_LINK_CLASS =
  'class="no-underline transition-colors hover:no-underline focus-visible:ring-2"';

/** Bundled CSS matching the docs footer sublabel hover/focus inherit contract. */
export const CUSTOMER_ASK_PASSING_BUNDLED_FOOTER_CSS = `
  #nd-page a[class*=hover\\:bg-fd-accent][class*=hover\\:text-fd-accent-foreground]:is(:hover,:focus-visible)>p.text-fd-muted-foreground{color:inherit}
`;

const HEADER_SEARCH_TRIGGER = `
  <button data-search="" aria-label="Open search" class="group">
    <span>Search</span>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">⌘</kbd>
    <kbd class="group-hover:text-accent-foreground group-hover:bg-accent-foreground/10">K</kbd>
  </button>
`;

export const CUSTOMER_ASK_PASSING_HOME_HTML = `
  <html>
    <header>
      <nav aria-label="Primary">
        <a href="/">Home</a>
        <a href="/docs/architecture">Architecture</a>
        <a href="/docs/glossary">Glossary</a>
        <a href="/tags">Tags</a>
      </nav>
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

/** Pre-repair home HTML with excess brush header margin for follow-up brevity checks. */
export const CUSTOMER_ASK_PRE_REPAIR_HOME_BREVITY_HTML =
  CUSTOMER_ASK_PASSING_HOME_HTML.replace(
    '<header class="relative overflow-hidden rounded-lg px-6 py-10">',
    '<header class="relative mb-8 overflow-hidden rounded-lg px-6 py-10">',
  );

export { PRE_REPAIR_SEARCH_RESULT_ROW_HTML } from "./customer-ask-search-follow-up-convergence";

export const CUSTOMER_ASK_PRE_REPAIR_HOME_HTML = `
  <html>
    <header>
      <nav aria-label="Primary">
        <a href="/">Home</a>
        <a href="/search">Search</a>
      </nav>
      ${HEADER_SEARCH_TRIGGER}
    </header>
    <main>
      <article>
        <h1>Model Atlas</h1>
        <section id="search" aria-labelledby="home-search-heading">
          <h2 id="home-search-heading">${REMOVED_HOME_INLINE_SEARCH_SECTION_TITLE}</h2>
          <input data-search="" aria-label="Search Model Atlas" />
        </section>
      </article>
    </main>
  </html>
`;

const POST_REPAIR_TAGS_INDEX_BODY = `
  <section class="flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
`;

const POST_REPAIR_ATTENTION_LANDING_BODY = `
  <section class="flex flex-col gap-8" aria-label="Resources">
    <section aria-labelledby="tag-resources-module">
      <h2 id="tag-resources-module">Module</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li><a href="/docs/modules/grouped-query-attention">Grouped-Query Attention</a></li>
      </ul>
    </section>
  </section>
`;

export const CUSTOMER_ASK_PRE_REPAIR_TAGS_INDEX_HTML = `<html>
  <section class="mt-8 flex flex-col gap-8" aria-label="Tags">
    <section aria-labelledby="tag-category-module-type">
      <h2 id="tag-category-module-type">Module type</h2>
      <ul class="mt-3 flex list-disc flex-col gap-3">
        <li><a href="/tags/attention">Attention</a></li>
      </ul>
    </section>
  </section>
</html>`;

const CUSTOMER_ASK_PASSING_GLOSSARY_BODY = `
  <h1>Token</h1>
  <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
    <ul data-testid="tag-pill-list" aria-label="Tags">
      <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
    </ul>
    <ul data-testid="curated-related-docs">
      <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
    </ul>
  </article>
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

export const CUSTOMER_ASK_PASSING_GLOSSARY_HTML = buildPhase1DocsRouteStubHtml(
  CUSTOMER_ASK_PASSING_GLOSSARY_BODY,
);

export const CUSTOMER_ASK_PRE_REPAIR_GLOSSARY_HTML =
  buildPhase1DocsRouteStubHtml(`
  <h1>Token</h1>
  <article data-registry-id="${GLOSSARY_TOKEN_REGISTRY_ID}">
    <section id="where-it-appears"><h2>Where It Appears</h2></section>
    <p data-testid="glossary-opening">Summary</p>
    <ul data-testid="tag-pill-list" aria-label="Tags">
      <li><a href="/tags/attention" class="underline">Attention</a></li>
    </ul>
    <ul data-testid="curated-related-docs">
      <li><a href="/docs/glossary/embedding" ${CHROME_LINK_CLASS}>Embedding</a></li>
    </ul>
  </article>
`);

const CUSTOMER_ASK_PASSING_GQA_MODULE_BODY = `
  <h1>Grouped-Query Attention</h1>
  <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
  <h2>Compared To Nearby Modules</h2>
  <h2>Related</h2>
  <div data-react-flow-graph="true" data-web-renderer="react-flow"></div>
  <span data-graph-node-id="hidden-states"></span>
  <span data-graph-node-id="query-groups"></span>
  <span data-graph-node-id="query-heads"></span>
  <span data-graph-node-id="kv-cache"></span>
  <div data-registry-comparison-table="true" data-table-id="table.grouped-query-attention-comparison"></div>
  <a href="/docs/modules/multi-head-attention">Multi-Head Attention</a>
  <div data-attention-schema-comparison="true"></div>
  <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
  <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
  <section aria-label="Architecture">
    <ul class="list-none">
      <li><a href="/docs/modules/multi-query-attention">MQA</a></li>
    </ul>
  </section>
  <ul data-testid="tag-pill-list" aria-label="Tags">
    <li><a href="/tags/attention">Attention</a></li>
  </ul>
`;

export const CUSTOMER_ASK_PASSING_GQA_MODULE_HTML =
  buildPhase1DocsRouteStubHtml(
    `${CUSTOMER_ASK_PASSING_GQA_MODULE_BODY}${buildGroupedQueryAttentionStubBody()}`,
  );

export const CUSTOMER_ASK_PRE_REPAIR_GQA_MODULE_HTML =
  buildPhase1DocsRouteStubHtml(`
  <h1>Grouped-Query Attention</h1>
  <div data-registry-id="${GQA_MODULE_REGISTRY_ID}"></div>
  <h2>Variants And Nearby Modules</h2>
  <div data-react-flow-graph="true"></div>
  <div data-message-block-math="math.mhaSchema.formula" class="katex"></div>
  <div data-message-block-math="math.gqaSchema.formula" class="katex-display"></div>
`);

/** Built-app HTML that satisfies all customer-ask convergence HTTP checks. */
export const CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML: Record<
  string,
  string
> = {
  "/": CUSTOMER_ASK_PASSING_HOME_HTML,
  [TAG_LIST_CUSTOMER_ASK_ROUTES.tagsIndex]: `<html><header>${PRIMARY_NAV}</header>${POST_REPAIR_TAGS_INDEX_BODY}</html>`,
  [TAG_LIST_CUSTOMER_ASK_ROUTES.attentionLanding]: `<html><header>${PRIMARY_NAV}</header><h1>Attention</h1><a href="/docs/modules/grouped-query-attention">GQA</a><a href="${TOKEN_GLOSSARY_URL}">Token</a><a href="${ATTENTION_TAG_SCOPED_SEARCH_URL}">Search</a>${POST_REPAIR_ATTENTION_LANDING_BODY}</html>`,
  [TOKEN_GLOSSARY_URL]: CUSTOMER_ASK_PASSING_GLOSSARY_HTML,
  [PHASE_1_GROUPED_QUERY_ATTENTION_URL]: CUSTOMER_ASK_PASSING_GQA_MODULE_HTML,
};

/** Merges Phase 1 UX passing stubs with customer-ask post-repair overrides. */
export function buildPhase1AndCustomerAskPassingStubHtml(): Record<
  string,
  string
> {
  return {
    ...PHASE_1_UX_PASSING_STUB_HTML,
    ...CUSTOMER_ASK_CONVERGENCE_PASSING_STUB_HTML,
  };
}

export const CUSTOMER_ASK_PASSING_API_RESULTS: Record<
  string,
  Array<{ url: string }>
> = {
  GQA: [
    { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL },
    { url: TOKEN_GLOSSARY_URL },
  ],
  attention: [
    { url: PHASE_1_ATTENTION_MODULE_URL },
    { url: TOKEN_GLOSSARY_URL },
    { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL },
  ],
  vector: [{ url: PHASE_1_VECTOR_GLOSSARY_URL }, { url: TOKEN_GLOSSARY_URL }],
  "hidden size": [
    { url: PHASE_1_HIDDEN_SIZE_GLOSSARY_URL },
    { url: TOKEN_GLOSSARY_URL },
  ],
  "KV cache": [
    { url: TOKEN_GLOSSARY_URL },
    { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL },
  ],
};
