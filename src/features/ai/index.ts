/**
 * AI-owned domain namespace for widgets and helpers used by docs pages.
 *
 * - `@/features/ai` — server-safe helpers (safe for SSR module evaluation)
 * - `@/features/ai/models` — model/module/paper/training/system renderers
 * - `@/features/ai/topology` — topology helpers and renderers
 * - `@/features/ai/timeline` — timeline helpers and renderers
 */

export * as models from "./models";
export * from "./server";
export * as timeline from "./timeline";
export * as topology from "./topology";
