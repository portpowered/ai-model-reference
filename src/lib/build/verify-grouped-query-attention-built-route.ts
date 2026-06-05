import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertGroupedQueryAttentionModuleConvergence } from "@/lib/verify/grouped-query-attention-module-convergence";

/** Relative path to the production-built grouped-query-attention module page. */
export const GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/grouped-query-attention.html";

export type VerifyGroupedQueryAttentionBuiltRouteResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifyGroupedQueryAttentionBuiltRouteFromHtml(
  html: string,
): VerifyGroupedQueryAttentionBuiltRouteResult {
  const visibleHtml = stripHtmlScripts(html);
  const failure = assertGroupedQueryAttentionModuleConvergence(visibleHtml);
  if (failure) {
    return { ok: false, reason: failure };
  }
  return { ok: true };
}

export function verifyGroupedQueryAttentionBuiltRouteFromFile(
  htmlPath: string = GROUPED_QUERY_ATTENTION_BUILT_HTML_PATH,
  cwd: string = process.cwd(),
): VerifyGroupedQueryAttentionBuiltRouteResult {
  const absolutePath = isAbsolute(htmlPath) ? htmlPath : join(cwd, htmlPath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing built HTML at ${htmlPath} — run \`bun run build\` first.`,
    };
  }

  const html = readFileSync(absolutePath, "utf8");
  return verifyGroupedQueryAttentionBuiltRouteFromHtml(html);
}
