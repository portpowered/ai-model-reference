import {
  GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
  verifyGroupedQueryAttentionBuiltRouteFromFile,
} from "../src/lib/build/verify-grouped-query-attention-built-route";

const htmlPath = process.argv[2] ?? GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH;
const result = verifyGroupedQueryAttentionBuiltRouteFromFile(htmlPath);

if (!result.ok) {
  console.error(
    "Grouped-query-attention built route convergence verification failed:",
  );
  console.error(`  ${result.reason}`);
  process.exit(1);
}

console.log(
  "Grouped-query-attention built route convergence verified (Phase 1 module markers).",
);
