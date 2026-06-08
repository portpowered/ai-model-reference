import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertSparseAttentionModuleConvergence } from "@/lib/verify/sparse-attention-module-convergence";

/** Relative path to the production-built sparse-attention module page. */
export const SPARSE_ATTENTION_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/sparse-attention.html";

/** Relative path to the static-export sparse-attention module page. */
export const SPARSE_ATTENTION_EXPORT_HTML_PATH =
  "out/docs/modules/sparse-attention.html";

export type VerifySparseAttentionBuiltRouteResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifySparseAttentionBuiltRouteFromHtml(
  html: string,
): VerifySparseAttentionBuiltRouteResult {
  const visibleHtml = stripHtmlScripts(html);
  const failure = assertSparseAttentionModuleConvergence(visibleHtml);
  if (failure) {
    return { ok: false, reason: failure };
  }
  return { ok: true };
}

export function verifySparseAttentionBuiltRouteFromFile(
  htmlPath: string = SPARSE_ATTENTION_BUILT_HTML_PATH,
  cwd: string = process.cwd(),
): VerifySparseAttentionBuiltRouteResult {
  const absolutePath = isAbsolute(htmlPath) ? htmlPath : join(cwd, htmlPath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing built HTML at ${htmlPath} — run \`bun run build\` first.`,
    };
  }

  const html = readFileSync(absolutePath, "utf8");
  return verifySparseAttentionBuiltRouteFromHtml(html);
}
