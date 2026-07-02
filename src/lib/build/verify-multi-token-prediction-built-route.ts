import { existsSync, readFileSync } from "node:fs";
import { isAbsolute, join } from "node:path";
import { normalizeBuiltAppHtmlInternalPaths } from "@/lib/build/built-app-html-test-utils";
import { stripHtmlScripts } from "@/lib/navigation/docs-sidebar-contract";
import { assertMultiTokenPredictionModuleConvergence } from "@/lib/verify/multi-token-prediction-module-convergence";

/** Relative path to the production-built multi-token-prediction module page. */
export const MULTI_TOKEN_PREDICTION_BUILT_HTML_PATH =
  ".next/server/app/docs/modules/multi-token-prediction.html";

/** Relative path to the static-export multi-token-prediction module page. */
export const MULTI_TOKEN_PREDICTION_EXPORT_HTML_PATH =
  "out/docs/modules/multi-token-prediction.html";

export type VerifyMultiTokenPredictionBuiltRouteResult =
  | { ok: true }
  | { ok: false; reason: string };

export function verifyMultiTokenPredictionBuiltRouteFromHtml(
  html: string,
): VerifyMultiTokenPredictionBuiltRouteResult {
  const visibleHtml = stripHtmlScripts(
    normalizeBuiltAppHtmlInternalPaths(html),
  );
  const failure = assertMultiTokenPredictionModuleConvergence(visibleHtml);
  if (failure) {
    return { ok: false, reason: failure };
  }
  return { ok: true };
}

export function verifyMultiTokenPredictionBuiltRouteFromFile(
  htmlPath: string = MULTI_TOKEN_PREDICTION_BUILT_HTML_PATH,
  cwd: string = process.cwd(),
): VerifyMultiTokenPredictionBuiltRouteResult {
  const absolutePath = isAbsolute(htmlPath) ? htmlPath : join(cwd, htmlPath);
  if (!existsSync(absolutePath)) {
    return {
      ok: false,
      reason: `Missing built HTML at ${htmlPath} — run \`bun run build\` first.`,
    };
  }

  const html = readFileSync(absolutePath, "utf8");
  return verifyMultiTokenPredictionBuiltRouteFromHtml(html);
}
