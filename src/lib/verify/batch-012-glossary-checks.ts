import { glossaryPageHref } from "@/lib/content/content-hrefs";
import { GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW } from "./customer-ask-glossary-convergence";

/** Checklist row for batch-012 glossary page customer-ask inventory. */
export const BATCH_012_GLOSSARY_CHECKLIST_ROW =
  GLOSSARY_CUSTOMER_ASK_CHECKLIST_ROW;

export const BATCH_012_GLOSSARY_ROUTES = {
  token: glossaryPageHref("token"),
  embedding: glossaryPageHref("embedding"),
} as const;

export const BATCH_012_GLOSSARY_CHECKS = {
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
