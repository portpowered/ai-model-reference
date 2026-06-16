import { describe, test } from "bun:test";

/**
 * Served static-export search UX Playwright probes live in
 * `src/tests/build/next-build-tracing-warning.test.ts` immediately after the
 * in-suite production build so they do not contend with parallel export probes
 * or fail on unhydrated `/search` input snapshots during full `make test`.
 */
describe("static export search UX", () => {
  test("served export probes run in next-build-tracing-warning.test.ts after in-suite build", () => {
    // Unit and stub coverage lives in export-search-ux-checks.test.ts;
    // `make build-export` runs scripts/verify-phase-1-export-search-ux.ts.
  });
});
