import {
  BATCH_013_GLOSSARY_CHECKLIST_ROW,
  BATCH_013_GLOSSARY_CHECKS,
  BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES,
  BATCH_013_GLOSSARY_ROUTES,
} from "./batch-013-glossary-checks";
import {
  BATCH_013_ROUTE_CHECKS,
  BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
  BATCH_013_ROUTE_PATHS,
} from "./batch-013-route-checks";
import type { CustomerAskConvergenceRow } from "./customer-ask-convergence-result";
import {
  GLOSSARY_EMBEDDING_REGISTRY_ID,
  GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
  GLOSSARY_TOKEN_REGISTRY_ID,
  GLOSSARY_VECTOR_REGISTRY_ID,
} from "./customer-ask-glossary-convergence";
import {
  assertEmbeddingDescriptionLinks,
  assertGlossaryNoRenderedOpeningSummaryForRegistry,
} from "./customer-ask-glossary-page-convergence";
import {
  assertHiddenSizeRoutePage,
  assertVectorRoutePage,
} from "./customer-ask-missing-pages-convergence";

export const BATCH_013_OPENING_SUMMARY_REGISTRY_BY_ROUTE = {
  [BATCH_013_GLOSSARY_ROUTES.token]: GLOSSARY_TOKEN_REGISTRY_ID,
  [BATCH_013_GLOSSARY_ROUTES.embedding]: GLOSSARY_EMBEDDING_REGISTRY_ID,
  [BATCH_013_GLOSSARY_ROUTES.vector]: GLOSSARY_VECTOR_REGISTRY_ID,
  [BATCH_013_GLOSSARY_ROUTES.hiddenSize]: GLOSSARY_HIDDEN_SIZE_REGISTRY_ID,
} as const;

export type Batch013GlossaryOpeningSummaryRoute =
  (typeof BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES)[number];

function toPassFailRow(input: {
  checkId: string;
  title: string;
  route: string;
  checklistRow: string;
  reason: string | null;
}): CustomerAskConvergenceRow {
  return {
    checkId: input.checkId,
    title: input.title,
    status: input.reason ? "fail" : "pass",
    route: input.route,
    reason: input.reason ?? undefined,
    checklistRow: input.checklistRow,
  };
}

/**
 * Builds a batch-013 opening-summary customer-ask row for a reopened glossary route.
 */
export function buildBatch013GlossaryNoOpeningSummaryRow(
  html: string,
  route: Batch013GlossaryOpeningSummaryRoute,
): CustomerAskConvergenceRow {
  return toPassFailRow({
    checkId: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.checkId,
    title: BATCH_013_GLOSSARY_CHECKS.noRenderedOpeningSummary.title,
    route,
    checklistRow: BATCH_013_GLOSSARY_CHECKLIST_ROW,
    reason: assertGlossaryNoRenderedOpeningSummaryForRegistry(
      html,
      BATCH_013_OPENING_SUMMARY_REGISTRY_BY_ROUTE[route],
    ),
  });
}

/**
 * Builds the batch-013 embedding description-link customer-ask row from built HTML.
 */
export function buildBatch013EmbeddingDescriptionLinksRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow({
    checkId: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.checkId,
    title: BATCH_013_GLOSSARY_CHECKS.embeddingDescriptionLinks.title,
    route: BATCH_013_GLOSSARY_ROUTES.embedding,
    checklistRow: BATCH_013_GLOSSARY_CHECKLIST_ROW,
    reason: assertEmbeddingDescriptionLinks(html),
  });
}

/**
 * Builds the batch-013 vector glossary route customer-ask row from built HTML.
 */
export function buildBatch013VectorRouteRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow({
    checkId: BATCH_013_ROUTE_CHECKS.vectorRoute.checkId,
    title: BATCH_013_ROUTE_CHECKS.vectorRoute.title,
    route: BATCH_013_ROUTE_PATHS.vectorGlossary,
    checklistRow: BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
    reason: assertVectorRoutePage(html),
  });
}

/**
 * Builds the batch-013 hidden-size glossary route customer-ask row from built HTML.
 */
export function buildBatch013HiddenSizeRouteRow(
  html: string,
): CustomerAskConvergenceRow {
  return toPassFailRow({
    checkId: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.checkId,
    title: BATCH_013_ROUTE_CHECKS.hiddenSizeRoute.title,
    route: BATCH_013_ROUTE_PATHS.hiddenSizeGlossary,
    checklistRow: BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW,
    reason: assertHiddenSizeRoutePage(html),
  });
}

/**
 * Builds batch-013 glossary route convergence rows in inventory order from built
 * HTML snapshots keyed by glossary route path.
 */
export function buildBatch013GlossaryRouteConvergenceRows(input: {
  htmlByRoute: Readonly<Record<string, string>>;
}): CustomerAskConvergenceRow[] {
  const rows: CustomerAskConvergenceRow[] = [];

  for (const route of BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES) {
    rows.push(
      buildBatch013GlossaryNoOpeningSummaryRow(
        input.htmlByRoute[route] ?? "",
        route,
      ),
    );
  }

  rows.push(
    buildBatch013EmbeddingDescriptionLinksRow(
      input.htmlByRoute[BATCH_013_GLOSSARY_ROUTES.embedding] ?? "",
    ),
    buildBatch013VectorRouteRow(
      input.htmlByRoute[BATCH_013_ROUTE_PATHS.vectorGlossary] ?? "",
    ),
    buildBatch013HiddenSizeRouteRow(
      input.htmlByRoute[BATCH_013_ROUTE_PATHS.hiddenSizeGlossary] ?? "",
    ),
  );

  return rows;
}
