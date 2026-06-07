import { glossaryPageHref } from "@/lib/content/content-hrefs";
import { GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-glossary-convergence";

/** Checklist row for batch-013 glossary page customer-ask inventory. */
export const BATCH_013_GLOSSARY_CHECKLIST_ROW =
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_013_GLOSSARY_ROUTES = {
  token: glossaryPageHref("token"),
  embedding: glossaryPageHref("embedding"),
  vector: glossaryPageHref("vector"),
  hiddenSize: glossaryPageHref("hidden-size"),
} as const;

/** Glossary routes in the batch-013 reopened opening-summary repair set. */
export const BATCH_013_GLOSSARY_OPENING_SUMMARY_ROUTES = [
  BATCH_013_GLOSSARY_ROUTES.token,
  BATCH_013_GLOSSARY_ROUTES.embedding,
  BATCH_013_GLOSSARY_ROUTES.vector,
  BATCH_013_GLOSSARY_ROUTES.hiddenSize,
] as const;

export const BATCH_013_GLOSSARY_CHECKS = {
  noRenderedOpeningSummary: {
    checkId: "glossary.no-rendered-opening-summary",
    title:
      "Glossary pages omit rendered openingSummary block separate from description",
  },
  embeddingDescriptionLinks: {
    checkId: "glossary.embedding-description-links",
    title: "Embedding glossary description links vector and token targets",
  },
} as const;
