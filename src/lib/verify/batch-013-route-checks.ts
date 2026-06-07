import { GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-glossary-convergence";
import {
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "./phase-1-search-checks";

/** Checklist row for batch-013 reopened glossary route checks. */
export const BATCH_013_ROUTE_GLOSSARY_CHECKLIST_ROW =
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_013_ROUTE_CHECKS = {
  vectorRoute: {
    checkId: "pages.vector-route",
    title: "Vector glossary route returns a reader-facing page",
  },
  hiddenSizeRoute: {
    checkId: "pages.hidden-size-route",
    title: "Hidden size glossary route returns a reader-facing page",
  },
} as const;

export const BATCH_013_ROUTE_PATHS = {
  vectorGlossary: PHASE_1_VECTOR_GLOSSARY_URL,
  hiddenSizeGlossary: PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
} as const;
