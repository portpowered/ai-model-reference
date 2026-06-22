import { normalizeOntologyClassificationSelector } from "@/lib/content/ontology-classification-selectors";

type TopologyCompatibilitySelectorEntry = {
  selector: string;
  classificationId: string;
};

const TOPOLOGY_COMPATIBILITY_SELECTOR_ENTRIES: readonly TopologyCompatibilitySelectorEntry[] =
  [
    {
      selector: "classification.activation-functions",
      classificationId: "classification.module.activation",
    },
    {
      selector: "classification.attention-mechanisms",
      classificationId: "classification.module.attention",
    },
    {
      selector: "classification.feed-forward-networks",
      classificationId: "classification.module.feed-forward",
    },
    {
      selector: "classification.normalization-layers",
      classificationId: "classification.module.normalization",
    },
    {
      selector: "classification.position-encoding-methods",
      classificationId: "classification.module.positional-encoding",
    },
    {
      selector: "classification.tokenization-methods",
      classificationId: "classification.module.tokenization",
    },
    {
      selector: "classification.transformer-block-structures",
      classificationId: "classification.module.transformer-block",
    },
    {
      selector: "activation",
      classificationId: "classification.module.activation",
    },
    {
      selector: "activation-function",
      classificationId: "classification.module.activation",
    },
    {
      selector: "feed-forward",
      classificationId: "classification.module.feed-forward",
    },
    {
      selector: "feed-forward-network",
      classificationId: "classification.module.feed-forward",
    },
  ];

export function listTopologyCompatibilitySelectorEntries(): readonly TopologyCompatibilitySelectorEntry[] {
  return TOPOLOGY_COMPATIBILITY_SELECTOR_ENTRIES;
}

export function resolveTopologyCompatibilityClassificationId(
  selector: string,
): string | undefined {
  const normalizedSelector = normalizeOntologyClassificationSelector(selector);

  return TOPOLOGY_COMPATIBILITY_SELECTOR_ENTRIES.find(
    (entry) =>
      normalizeOntologyClassificationSelector(entry.selector) ===
      normalizedSelector,
  )?.classificationId;
}
