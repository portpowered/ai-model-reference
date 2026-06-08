import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertMultiHeadLatentAttentionModuleConvergence } from "@/lib/verify/multi-head-latent-attention-module-convergence";

/** Relative path to the production-built multi-head-latent-attention module page. */
export const MULTI_HEAD_LATENT_ATTENTION_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/multi-head-latent-attention.html";

/** Relative path to the static-export multi-head-latent-attention module page. */
export const MULTI_HEAD_LATENT_ATTENTION_EXPORT_HTML_PATH =
  "out/docs/modules/multi-head-latent-attention.html";

export type VerifyMultiHeadLatentAttentionBuiltRouteResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifyMultiHeadLatentAttentionBuiltRouteFromHtml(
  html: string,
): VerifyMultiHeadLatentAttentionBuiltRouteResult {
  const visibleHtml = stripHtmlScripts(html);
  const failure = assertMultiHeadLatentAttentionModuleConvergence(visibleHtml);
  if (failure) {
    return { ok: false, reason: failure };
  }
  return { ok: true };
}

export function verifyMultiHeadLatentAttentionBuiltRouteFromFile(
  htmlPath: string = MULTI_HEAD_LATENT_ATTENTION_BUILT_HTML_PATH,
  cwd: string = process.cwd(),
): VerifyMultiHeadLatentAttentionBuiltRouteResult {
  const absolutePath = isAbsolute(htmlPath) ? htmlPath : join(cwd, htmlPath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing built HTML at ${htmlPath} — run \`bun run build\` first.`,
    };
  }

  const html = readFileSync(absolutePath, "utf8");
  return verifyMultiHeadLatentAttentionBuiltRouteFromHtml(html);
}
