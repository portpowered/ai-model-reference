import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertLinearAttentionModuleConvergence } from "@/lib/verify/linear-attention-module-convergence";

/** Relative path to the production-built linear-attention module page. */
export const LINEAR_ATTENTION_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/linear-attention.html";

/** Relative path to the static-export linear-attention module page. */
export const LINEAR_ATTENTION_EXPORT_HTML_PATH =
  "out/docs/modules/linear-attention.html";

export type VerifyLinearAttentionBuiltRouteResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifyLinearAttentionBuiltRouteFromHtml(
  html: string,
): VerifyLinearAttentionBuiltRouteResult {
  const visibleHtml = stripHtmlScripts(html);
  const failure = assertLinearAttentionModuleConvergence(visibleHtml);
  if (failure) {
    return { ok: false, reason: failure };
  }
  return { ok: true };
}

export function verifyLinearAttentionBuiltRouteFromFile(
  htmlPath: string = LINEAR_ATTENTION_BUILT_HTML_PATH,
  cwd: string = process.cwd(),
): VerifyLinearAttentionBuiltRouteResult {
  const absolutePath = isAbsolute(htmlPath) ? htmlPath : join(cwd, htmlPath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing built HTML at ${htmlPath} — run \`bun run build\` first.`,
    };
  }

  const html = readFileSync(absolutePath, "utf8");
  return verifyLinearAttentionBuiltRouteFromHtml(html);
}
