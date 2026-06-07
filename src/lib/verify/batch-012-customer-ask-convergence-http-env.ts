import { searchInlineResultsListClassName } from "@/features/docs/components/list-decoration";
import type { RunCustomerAskMissingPagesChecksOptions } from "./customer-ask-missing-pages-convergence-http";
import type { RunCustomerAskMobileHeaderChecksOptions } from "./customer-ask-mobile-header-convergence-http";
import type { RunCustomerAskTagSearchDecorationChecksOptions } from "./customer-ask-tag-search-decoration-convergence-http";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_GROUPED_QUERY_ATTENTION_URL,
} from "./phase-1-search-checks";

export const VERIFY_CUSTOMER_ASK_BATCH_012_STUB_ENV =
  "VERIFY_CUSTOMER_ASK_BATCH_012_STUB";

const PASSING_SEARCH_INLINE_RESULTS_HTML = `
  <ul class="${searchInlineResultsListClassName}" data-testid="search-page-results">
    <li>
      <button type="button" data-testid="search-result-row">
        <span data-testid="search-result-title-mark">Grouped-Query Attention</span>
      </button>
    </li>
  </ul>
`;

export type CustomerAskBatch012CheckOptionsFromEnv = {
  mobileHeaderOptions?: RunCustomerAskMobileHeaderChecksOptions;
  tagSearchDecorationOptions?: RunCustomerAskTagSearchDecorationChecksOptions;
  missingPagesOptions?: RunCustomerAskMissingPagesChecksOptions;
};

/**
 * Test-only stub hook: when VERIFY_CUSTOMER_ASK_BATCH_012_STUB=pass, skips
 * Playwright probes for batch-012 mobile header, search decoration, and missing
 * pages discoverability checks.
 */
export function resolveCustomerAskBatch012CheckOptionsFromEnv(
  env: Record<string, string | undefined> = process.env,
): CustomerAskBatch012CheckOptionsFromEnv {
  if (env[VERIFY_CUSTOMER_ASK_BATCH_012_STUB_ENV]?.trim() !== "pass") {
    return {};
  }

  return {
    mobileHeaderOptions: {
      runMobileHeaderViewportProbe: async () => null,
    },
    tagSearchDecorationOptions: {
      runSearchPageResultsHtmlProbe: async (_baseUrl, query) => ({
        html: `<div data-query="${query}">${PASSING_SEARCH_INLINE_RESULTS_HTML}</div>`,
      }),
    },
    missingPagesOptions: {
      runSearchAttentionSnapshotProbe: async () => ({
        resultUrls: [
          PHASE_1_ATTENTION_MODULE_URL,
          PHASE_1_GROUPED_QUERY_ATTENTION_URL,
        ],
        matchedTagsVisible: false,
        hasResults: true,
        hasEmpty: false,
      }),
      fetchAttentionApiResults: async () => ({
        results: [
          { url: PHASE_1_ATTENTION_MODULE_URL },
          { url: PHASE_1_GROUPED_QUERY_ATTENTION_URL },
        ],
      }),
    },
  };
}
