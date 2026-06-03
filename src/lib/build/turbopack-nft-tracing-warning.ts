/**
 * Detects Turbopack NFT whole-project filesystem tracing warnings during `next build`.
 *
 * Next.js 16+ (see vercel/next.js#89157): when `next.config` appears in the NFT trace,
 * Turbopack assumes the repository root was traced unintentionally and prints a warning
 * even though the build may exit 0.
 *
 * Guarded substrings (update when Next.js changes diagnostics):
 * - "Encountered unexpected file" … "NFT" (primary Turbopack NFT list warning)
 * - "whole project" … "traced unintentionally" / "unintentionally traced"
 * - "unintentional" … "whole-project" / "whole project" … "filesystem" … "trac"
 * - Import trace through `next.config` with filesystem APIs (content-loader chains)
 */
export const TURBOPACK_NFT_WHOLE_PROJECT_TRACING_WARNING_PATTERNS: readonly RegExp[] =
  [
    /Encountered unexpected file[\s\S]{0,400}?\bNFT\b/i,
    /whole project[\s\S]{0,200}?(?:traced unintentionally|unintentionally traced)/i,
    /unintentional(?:ly)?[\s\S]{0,200}?whole[- ]project[\s\S]{0,200}?(?:filesystem )?trac(?:e|ing)/i,
    /next\.config\.(?:ts|js|mjs|cjs)[\s\S]{0,800}?Import trace[\s\S]{0,800}?(?:node:fs|fs\/promises|process\.cwd)/i,
  ];

export function buildOutputHasTurbopackWholeProjectTracingWarning(
  output: string,
): boolean {
  return TURBOPACK_NFT_WHOLE_PROJECT_TRACING_WARNING_PATTERNS.some((pattern) =>
    pattern.test(output),
  );
}

export function firstMatchingTurbopackTracingWarningPattern(
  output: string,
): string | undefined {
  for (const pattern of TURBOPACK_NFT_WHOLE_PROJECT_TRACING_WARNING_PATTERNS) {
    if (pattern.test(output)) {
      return pattern.source;
    }
  }
  return undefined;
}
