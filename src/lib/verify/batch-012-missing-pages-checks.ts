import { GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-glossary-convergence";
import { GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-gqa-module-convergence";
import { SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-search-surface-convergence";
import {
  PHASE_1_ATTENTION_MODULE_URL,
  PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  PHASE_1_VECTOR_GLOSSARY_URL,
} from "./phase-1-search-checks";

export const BATCH_012_MISSING_PAGES_GLOSSARY_CHECKLIST_ROW =
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_012_MISSING_PAGES_MODULE_CHECKLIST_ROW =
  GQA_MODULE_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_012_MISSING_PAGES_SEARCH_CHECKLIST_ROW =
  SEARCH_SURFACE_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_012_ATTENTION_SEARCH_QUERY = "attention" as const;

export const BATCH_012_MISSING_PAGES_ROUTES = {
  attentionModule: PHASE_1_ATTENTION_MODULE_URL,
  vectorGlossary: PHASE_1_VECTOR_GLOSSARY_URL,
  hiddenSizeGlossary: PHASE_1_HIDDEN_SIZE_GLOSSARY_URL,
  searchPage: "/search",
  searchApi: "/api/search",
} as const;

export const BATCH_012_MISSING_PAGES_CHECKS = {
  attentionRoute: {
    checkId: "pages.attention-route",
    title: "Attention module route returns a reader-facing page",
  },
  vectorRoute: {
    checkId: "pages.vector-route",
    title: "Vector glossary route returns a reader-facing page",
  },
  hiddenSizeRoute: {
    checkId: "pages.hidden-size-route",
    title: "Hidden size glossary route returns a reader-facing page",
  },
  attentionDiscoverable: {
    checkId: "search.attention-discoverable",
    title:
      "Search surfaces return a canonical page-level attention hit without fragment-only URLs",
  },
} as const;
