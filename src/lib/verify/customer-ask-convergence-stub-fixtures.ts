import {
  PRIMARY_NAV_DESKTOP_CLASS,
  PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS,
} from "@/components/layout/primary-nav";
import { proseAutoLinkClassName } from "@/features/docs/components/prose-auto-link-class";
import { TOKEN_GLOSSARY_URL } from "@/lib/navigation/docs-sidebar-contract";
import { BATCH_012_GLOSSARY_ROUTES } from "./batch-012-glossary-checks";
import { GLOSSARY_TOKEN_REGISTRY_ID } from "./customer-ask-glossary-convergence";
import {
  GLOSSARY_PAGE_EMBEDDING_REGISTRY_ID,
  GLOSSARY_PAGE_EMBEDDING_TOKEN_HREF,
  GLOSSARY_PAGE_EMBEDDING_VECTOR_HREF,
  GLOSSARY_PAGE_TOKEN_REGISTRY_ID,
} from "./customer-ask-glossary-page-convergence";
import { GQA_MODULE_REGISTRY_ID } from "./customer-ask-gqa-module-convergence";
import {
  MISSING_PAGES_ATTENTION_REGISTRY_ID,
  MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID,
  MISSING_PAGES_VECTOR_REGISTRY_ID,
} from "./customer-ask-missing-pages-convergence";
import { TAG_LIST_CUSTOMER_ASK_ROUTES } from "./customer-ask-tag-list-convergence";
import { POST_REPAIR_TAG_RESOURCE_LINK_CLASS } from "./customer-ask-tag-search-decoration-convergence";
import {
  buildGroupedQueryAttentionStubBody,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
} from "./grouped-query-attention-module-convergence";
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
const PROSE_AUTO_LINK_CLASS = `class="${proseAutoLinkClassName}"`;

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
    <header class="border-b border-border">
      <div class="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-3">
        <button
          type="button"
          class="${PRIMARY_NAV_MOBILE_MENU_BUTTON_CLASS}"
          aria-expanded="false"
          aria-controls="mobile-nav-panel"
          aria-label="Open menu"
        >
          <svg aria-hidden="true"></svg>
        </button>
        <nav class="${PRIMARY_NAV_DESKTOP_CLASS}" aria-label="Primary">
          <a href="/">Home</a>
          <a href="/docs/architecture">Architecture</a>
          <a href="/docs/glossary">Glossary</a>
          <a href="/tags">Tags</a>
        </nav>
        ${HEADER_SEARCH_TRIGGER}
      </div>
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
        <li>
          <a href="/tags/attention" class="${POST_REPAIR_TAG_RESOURCE_LINK_CLASS}">
            <span class="font-medium text-foreground">Attention</span>
            <p class="mt-1 text-sm text-muted-foreground">Attention mechanisms</p>
          </a>
        </li>
      </ul>
    </section>
  </section>
`;

const POST_REPAIR_ATTENTION_LANDING_BODY = `
  <section class="flex flex-col gap-8" aria-label="Resources">
    <section aria-labelledby="tag-resources-module">
      <h2 id="tag-resources-module">Module</h2>
      <ul class="mt-3 flex list-none flex-col gap-3">
        <li>
          <a href="/docs/modules/grouped-query-attention" class="${POST_REPAIR_TAG_RESOURCE_LINK_CLASS}">
            <span class="font-medium text-foreground">Grouped-Query Attention</span>
            <p class="mt-1 text-sm text-muted-foreground">Shared KV heads</p>
          </a>
        </li>
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
  <p>The smallest unit of text a language model reads and predicts.</p>
  <article data-registry-id="${GLOSSARY_PAGE_TOKEN_REGISTRY_ID}">
    <section id="what-it-is"><h2>What It Is</h2></section>
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

export const CUSTOMER_ASK_PASSING_EMBEDDING_GLOSSARY_HTML = `<html>
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <div id="nd-sidebar">
    <span>Modules</span>
    <span>Glossary</span>
    <a href="${TOKEN_GLOSSARY_URL}">Token</a>
  </div>
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
</html>`;

export const CUSTOMER_ASK_PASSING_ATTENTION_MODULE_HTML =
  buildPhase1DocsRouteStubHtml(`
  <h1>Attention</h1>
  <div data-registry-id="${MISSING_PAGES_ATTENTION_REGISTRY_ID}"></div>
  <p>Phase 1 bridge page</p>
`);

export const CUSTOMER_ASK_PASSING_VECTOR_GLOSSARY_HTML =
  buildPhase1DocsRouteStubHtml(`
  <h1>Vector</h1>
  <article data-registry-id="${MISSING_PAGES_VECTOR_REGISTRY_ID}">
    <section id="what-it-is"><h2>What It Is</h2></section>
  </article>
`);

export const CUSTOMER_ASK_PASSING_HIDDEN_SIZE_GLOSSARY_HTML =
  buildPhase1DocsRouteStubHtml(`
  <h1>Hidden Size</h1>
  <article data-registry-id="${MISSING_PAGES_HIDDEN_SIZE_REGISTRY_ID}">
    <section id="what-it-is"><h2>What It Is</h2></section>
  </article>
`);

const GQA_STUB_BODY_WITHOUT_TAG_PILL =
  buildGroupedQueryAttentionStubBody().replace(
    /<ul data-testid="tag-pill-list"[^>]*><\/ul>/,
    "",
  );

const CUSTOMER_ASK_PASSING_GQA_MODULE_BODY = `
  <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
  <article data-registry-id="${GQA_MODULE_REGISTRY_ID}">
    <section aria-label="At a glance">
      <p>At a glance</p>
      <ul data-testid="tag-pill-list" aria-label="Tags">
        <li><a href="/tags/attention" ${CHROME_LINK_CLASS}>Attention</a></li>
      </ul>
    </section>
    <section id="how-it-works">
      ${GQA_STUB_BODY_WITHOUT_TAG_PILL}
    </section>
    <section id="math-or-compute-schema">
      <div data-attention-schema-comparison="true">
        <section data-attention-schema-variable-definitions="true">
          <h3>What the symbols mean</h3>
        </section>
      </div>
    </section>
    <section aria-label="Architecture">
      <ul class="list-none">
        <li><a href="/tags/attention">Attention</a></li>
        <li><a href="/docs/modules/multi-query-attention">MQA</a></li>
      </ul>
    </section>
  </article>
`;

export const CUSTOMER_ASK_PASSING_GQA_MODULE_HTML =
  buildPhase1DocsRouteStubHtml(CUSTOMER_ASK_PASSING_GQA_MODULE_BODY);

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
  [BATCH_012_GLOSSARY_ROUTES.embedding]:
    CUSTOMER_ASK_PASSING_EMBEDDING_GLOSSARY_HTML,
  [PHASE_1_ATTENTION_MODULE_URL]: CUSTOMER_ASK_PASSING_ATTENTION_MODULE_HTML,
  [PHASE_1_VECTOR_GLOSSARY_URL]: CUSTOMER_ASK_PASSING_VECTOR_GLOSSARY_HTML,
  [PHASE_1_HIDDEN_SIZE_GLOSSARY_URL]:
    CUSTOMER_ASK_PASSING_HIDDEN_SIZE_GLOSSARY_HTML,
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
