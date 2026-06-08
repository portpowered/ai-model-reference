import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertSlidingWindowAttentionModuleConvergence } from "@/lib/verify/sliding-window-attention-module-convergence";

/** Relative path to the production-built sliding-window-attention module page. */
export const SLIDING_WINDOW_ATTENTION_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/sliding-window-attention.html";

/** Relative path to the static-export sliding-window-attention module page. */
export const SLIDING_WINDOW_ATTENTION_EXPORT_HTML_PATH =
  "out/docs/modules/sliding-window-attention.html";

export type VerifySlidingWindowAttentionBuiltRouteResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifySlidingWindowAttentionBuiltRouteFromHtml(
  html: string,
): VerifySlidingWindowAttentionBuiltRouteResult {
  const visibleHtml = stripHtmlScripts(html);
  const failure = assertSlidingWindowAttentionModuleConvergence(visibleHtml);
  if (failure) {
    return { ok: false, reason: failure };
  }
  return { ok: true };
}

export function verifySlidingWindowAttentionBuiltRouteFromFile(
  htmlPath: string = SLIDING_WINDOW_ATTENTION_BUILT_HTML_PATH,
  cwd: string = process.cwd(),
): VerifySlidingWindowAttentionBuiltRouteResult {
  const absolutePath = isAbsolute(htmlPath) ? htmlPath : join(cwd, htmlPath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing built HTML at ${htmlPath} — run \`bun run build\` first.`,
    };
  }

  const html = readFileSync(absolutePath, "utf8");
  return verifySlidingWindowAttentionBuiltRouteFromHtml(html);
}
