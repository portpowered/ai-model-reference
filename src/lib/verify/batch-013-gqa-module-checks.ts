import {
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW,
  GQA_MODULE_CUSTOMER_ASK_ROUTE,
} from "./customer-ask-gqa-module-convergence";

/** Checklist row for batch-013 GQA module-page deduplication checks. */
export const BATCH_013_GQA_MODULE_PAGE_CHECKLIST_ROW =
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW;

/**
 * Checklist row for batch-013 GQA graph outcomes (theme markers and single
 * graph placement outside math/schema).
 */
export const BATCH_013_GQA_GRAPH_CHECKLIST_ROW =
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW;

/** Checklist row for batch-013 GQA math/schema Q/K/V definition outcomes. */
export const BATCH_013_GQA_MATH_CHECKLIST_ROW =
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_013_GQA_MODULE_ROUTE = GQA_MODULE_CUSTOMER_ASK_ROUTE;

export const BATCH_013_GQA_MODULE_CHECKS = {
  noDuplicateBodyHeading: {
    checkId: "module.no-duplicate-body-heading",
    title: "GQA module page omits duplicate body heading matching page title",
  },
  noMetadataCard: {
    checkId: "module.no-metadata-card",
    title: "GQA module page omits module metadata card outside At A Glance",
  },
  singleTagList: {
    checkId: "module.single-tag-list",
    title:
      "GQA module page exposes one module tag pill list outside At A Glance",
  },
  graphThemeReadability: {
    checkId: "module.graph-theme-readability",
    title:
      "GQA module React Flow graph exposes readable theme markers for node colors",
  },
  noDuplicateMathGraph: {
    checkId: "module.no-duplicate-math-graph",
    title:
      "GQA module page keeps a single React Flow graph outside math/schema sections",
  },
  mathQkvDefinitions: {
    checkId: "module.math-qkv-definitions",
    title:
      "GQA module math/schema sections define Q, K, and V in plain language",
  },
} as const;
