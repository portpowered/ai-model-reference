/**
 * Post-build integration tests exercised by `make test-integration` / `make ci`.
 * Script-level E2E validator suites (convergence validators, UX verifier CLI) stay
 * opt-in via full `VERIFY_PRODUCTION_INTEGRATION_TESTS=1 bun test`.
 */
export const PRODUCTION_INTEGRATION_TEST_PATHS = [
  "src/lib/content/glossary-presentation-convergence.test.tsx",
  "src/lib/content/grouped-query-attention-module-companion-convergence.test.tsx",
  "src/lib/verify/glossary-page-convergence.test.ts",
  "src/lib/verify/gqa-module-deduplication-convergence.test.ts",
  "src/lib/verify/gqa-module-graph-math-convergence.test.ts",
  "src/lib/verify/built-html-convergence-test-helpers.test.ts",
  "src/lib/verify/customer-ask-glossary-convergence.test.ts",
  "src/lib/verify/customer-ask-glossary-page-convergence.test.ts",
  "src/lib/verify/customer-ask-gqa-module-convergence.test.ts",
  "src/lib/verify/customer-ask-gqa-module-deduplication-convergence.test.ts",
  "src/lib/verify/customer-ask-gqa-module-graph-math-convergence.test.ts",
  "src/lib/verify/customer-ask-missing-pages-convergence.test.ts",
  "src/lib/verify/customer-ask-search-surface-convergence-http.test.ts",
  "src/lib/verify/server-lifecycle.test.ts",
  "src/tests/build/static-export-base-path-served-integration.test.ts",
  "src/tests/build/static-export-search-ux-integration.test.ts",
  "src/tests/layout/docs-index-shell.test.tsx",
  "src/tests/layout/docs-page-footer-hover-convergence.test.tsx",
  "src/tests/layout/docs-page-toc.test.tsx",
  "src/tests/layout/docs-sidebar-navigation.test.tsx",
  "src/tests/layout/grouped-query-attention-built-route-convergence.test.tsx",
  "src/tests/layout/linear-attention-built-route-convergence.test.tsx",
  "src/tests/layout/multi-head-latent-attention-built-route-convergence.test.tsx",
  "src/tests/layout/docs-shell-contract.test.tsx",
  "src/tests/layout/sliding-window-attention-built-route-convergence.test.tsx",
  "src/tests/layout/sparse-attention-built-route-convergence.test.tsx",
  "src/tests/layout/site-routes-shell.test.tsx",
  "src/tests/content/phase-1-attention-tag-landing-built-app.test.ts",
  "src/tests/content/phase-1-shell-discovery-built-app.test.ts",
] as const;
