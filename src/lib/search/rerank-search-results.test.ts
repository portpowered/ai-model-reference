import { describe, expect, test } from "bun:test";
import {
  findBestTitleMatchPageUrl,
  rerankSearchResults,
} from "./rerank-search-results";
import type { SearchDocument } from "./types";

function documentForUrl(
  url: string,
  overrides: Partial<SearchDocument> = {},
): SearchDocument {
  return {
    id: url,
    url,
    kind: "glossary",
    title: "Architecture",
    description: "Architecture description",
    bodyText: "",
    headings: [],
    directAliases: ["model architecture"],
    aliases: ["model architecture"],
    tags: ["taxonomy"],
    relatedIds: [],
    facets: { kind: "glossary", tags: ["taxonomy"] },
    topology: {
      secondaryClassificationIds: [],
      secondaryClassifications: [],
      relationships: [],
      terms: [],
    },
    ...overrides,
  };
}

describe("rerankSearchResults", () => {
  test("boosts a page hit when the query matches the document title", () => {
    const architectureUrl = "/docs/glossary/architecture";
    const moduleUrl = "/docs/modules/grouped-query-attention";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        architectureUrl,
        documentForUrl(architectureUrl, { title: "Architecture" }),
      ],
      [
        moduleUrl,
        documentForUrl(moduleUrl, {
          kind: "module",
          title: "Grouped-Query Attention",
          directAliases: ["GQA"],
          aliases: ["GQA"],
          facets: { kind: "module", tags: ["attention"] },
        }),
      ],
    ]);

    const results = rerankSearchResults(
      "architecture",
      [
        {
          id: "module-page",
          type: "page",
          url: moduleUrl,
          content: "Grouped-Query Attention",
        },
        {
          id: "architecture-page",
          type: "page",
          url: architectureUrl,
          content: "Architecture",
        },
      ],
      documentsByUrl,
    );

    expect(results[0]?.url).toBe(architectureUrl);
  });

  test("leaves order unchanged when no title, alias, or slug match qualifies", () => {
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        "/docs/glossary/token",
        documentForUrl("/docs/glossary/token", {
          title: "Token",
          directAliases: ["tokens"],
          aliases: ["tokens"],
        }),
      ],
    ]);

    const original = [
      {
        id: "token-page",
        type: "page" as const,
        url: "/docs/glossary/token",
        content: "Token",
      },
      {
        id: "token-text",
        type: "text" as const,
        url: "/docs/glossary/token#body",
        content: "tokenizer",
      },
    ];

    expect(rerankSearchResults("attention", original, documentsByUrl)).toEqual(
      original,
    );
  });

  test("findBestTitleMatchPageUrl resolves slug queries", () => {
    const generativeModelUrl = "/docs/glossary/generative-model";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        generativeModelUrl,
        documentForUrl(generativeModelUrl, {
          title: "Generative Model",
        }),
      ],
    ]);

    expect(findBestTitleMatchPageUrl("generative model", documentsByUrl)).toBe(
      generativeModelUrl,
    );
  });

  test("prefers published concept pages over module pages when title matches tie", () => {
    const conceptUrl = "/docs/concepts/mixture-of-experts";
    const moduleUrl = "/docs/modules/mixture-of-experts";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        moduleUrl,
        documentForUrl(moduleUrl, {
          kind: "module",
          title: "Mixture of Experts",
          directAliases: ["MoE", "sparse MoE"],
          aliases: ["MoE", "sparse MoE"],
          facets: { kind: "module", tags: ["feed-forward"] },
        }),
      ],
      [
        conceptUrl,
        documentForUrl(conceptUrl, {
          kind: "concept",
          title: "Mixture of Experts",
          directAliases: ["MoE", "mixture of experts", "sparse MoE"],
          aliases: ["MoE", "mixture of experts", "sparse MoE"],
          facets: { kind: "concept", tags: ["feed-forward"] },
        }),
      ],
    ]);

    expect(
      findBestTitleMatchPageUrl("mixture of experts", documentsByUrl),
    ).toBe(conceptUrl);
    expect(findBestTitleMatchPageUrl("MoE", documentsByUrl)).toBe(conceptUrl);
    expect(findBestTitleMatchPageUrl("sparse MoE", documentsByUrl)).toBe(
      conceptUrl,
    );
  });

  test("uses direct aliases instead of broad tag aliases for exact page boosts", () => {
    const canonicalUrl = "/docs/concepts/feed-forward-network";
    const taggedUrl = "/docs/systems/expert-parallel-overlap";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        taggedUrl,
        documentForUrl(taggedUrl, {
          kind: "system",
          title: "Expert Parallel Overlap",
          directAliases: ["expert parallel overlap"],
          aliases: ["expert parallel overlap", "FFN"],
          tags: ["feed-forward"],
          facets: { kind: "system", tags: ["feed-forward"] },
        }),
      ],
      [
        canonicalUrl,
        documentForUrl(canonicalUrl, {
          kind: "module",
          title: "Feed-Forward Network",
          directAliases: ["FFN", "feedforward network"],
          aliases: ["FFN", "feedforward network", "feed-forward"],
          tags: ["feed-forward"],
          facets: { kind: "module", tags: ["feed-forward"] },
        }),
      ],
    ]);

    expect(findBestTitleMatchPageUrl("ffn", documentsByUrl)).toBe(canonicalUrl);
  });

  test("prefers paper pages over introducing modules when alias matches tie", () => {
    const paperUrl = "/docs/papers/gpt-2-report";
    const moduleUrl = "/docs/modules/byte-level-tokenization";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        moduleUrl,
        documentForUrl(moduleUrl, {
          kind: "module",
          title: "Byte-Level Tokenization",
          directAliases: [
            "byte-level tokenization",
            "Language Models are Unsupervised Multitask Learners",
          ],
          aliases: [
            "byte-level tokenization",
            "Language Models are Unsupervised Multitask Learners",
          ],
          facets: { kind: "module", tags: ["tokenization"] },
        }),
      ],
      [
        paperUrl,
        documentForUrl(paperUrl, {
          kind: "paper",
          title: "GPT-2 Report",
          directAliases: [
            "GPT-2 report",
            "Language Models are Unsupervised Multitask Learners",
          ],
          aliases: [
            "GPT-2 report",
            "Language Models are Unsupervised Multitask Learners",
          ],
          facets: { kind: "paper", tags: ["foundations"] },
        }),
      ],
    ]);

    expect(
      findBestTitleMatchPageUrl(
        "Language Models are Unsupervised Multitask Learners",
        documentsByUrl,
      ),
    ).toBe(paperUrl);
  });

  test("ranks primary classification matches before secondary matches and non-priority relationships", () => {
    const relationshipUrl = "/docs/modules/relationship";
    const secondaryUrl = "/docs/modules/secondary";
    const primaryUrl = "/docs/modules/primary";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        relationshipUrl,
        documentForUrl(relationshipUrl, {
          topology: {
            secondaryClassificationIds: [],
            secondaryClassifications: [],
            relationships: [
              {
                relationshipType: "uses",
                targetId: "classification.activation-functions",
                targetSlug: "activation-functions",
                targetAliases: ["activation family"],
              },
            ],
            terms: ["uses", "activation family"],
          },
        }),
      ],
      [
        secondaryUrl,
        documentForUrl(secondaryUrl, {
          topology: {
            secondaryClassificationIds: ["classification.activation-functions"],
            secondaryClassifications: [
              {
                id: "classification.activation-functions",
                slug: "activation-functions",
                label: "activation functions",
                aliases: ["activation family"],
                terms: ["activation-functions", "activation family"],
              },
            ],
            relationships: [],
            terms: ["activation-functions", "activation family"],
          },
        }),
      ],
      [
        primaryUrl,
        documentForUrl(primaryUrl, {
          topology: {
            primaryClassificationId: "classification.activation-functions",
            secondaryClassificationIds: [],
            primaryClassification: {
              id: "classification.activation-functions",
              slug: "activation-functions",
              label: "activation functions",
              aliases: ["activation family"],
              terms: ["activation-functions", "activation family"],
            },
            secondaryClassifications: [],
            relationships: [],
            terms: ["activation-functions", "activation family"],
          },
        }),
      ],
    ]);

    const results = rerankSearchResults(
      "activation",
      [
        {
          id: "relationship",
          type: "page",
          url: relationshipUrl,
          content: "Relationship",
        },
        {
          id: "secondary",
          type: "page",
          url: secondaryUrl,
          content: "Secondary",
        },
        {
          id: "primary",
          type: "page",
          url: primaryUrl,
          content: "Primary",
        },
      ],
      documentsByUrl,
    );

    expect(results.map((result) => result.url)).toEqual([
      primaryUrl,
      relationshipUrl,
      secondaryUrl,
    ]);
  });

  test("lets ontology relationships that outrank siblings beat generic sibling matches", () => {
    const relationshipUrl = "/docs/modules/relationship";
    const secondaryUrl = "/docs/modules/secondary";
    const primaryUrl = "/docs/modules/primary";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        secondaryUrl,
        documentForUrl(secondaryUrl, {
          topology: {
            secondaryClassificationIds: ["classification.activation-functions"],
            secondaryClassifications: [
              {
                id: "classification.activation-functions",
                slug: "activation-functions",
                label: "activation functions",
                aliases: ["activation family"],
                terms: ["activation-functions", "activation family"],
              },
            ],
            relationships: [],
            terms: ["activation-functions", "activation family"],
          },
        }),
      ],
      [
        relationshipUrl,
        documentForUrl(relationshipUrl, {
          topology: {
            secondaryClassificationIds: [],
            secondaryClassifications: [],
            relationships: [
              {
                relationshipType: "variant",
                targetId: "classification.activation-functions",
                targetSlug: "activation-functions",
                targetAliases: ["activation family"],
              },
            ],
            terms: ["variant", "activation-functions", "activation family"],
          },
        }),
      ],
      [
        primaryUrl,
        documentForUrl(primaryUrl, {
          topology: {
            primaryClassificationId: "classification.activation-functions",
            secondaryClassificationIds: [],
            primaryClassification: {
              id: "classification.activation-functions",
              slug: "activation-functions",
              label: "activation functions",
              aliases: ["activation family"],
              terms: ["activation-functions", "activation family"],
            },
            secondaryClassifications: [],
            relationships: [],
            terms: ["activation-functions", "activation family"],
          },
        }),
      ],
    ]);

    const results = rerankSearchResults(
      "activation",
      [
        {
          id: "secondary",
          type: "page",
          url: secondaryUrl,
          content: "Secondary",
        },
        {
          id: "relationship",
          type: "page",
          url: relationshipUrl,
          content: "Relationship",
        },
        {
          id: "primary",
          type: "page",
          url: primaryUrl,
          content: "Primary",
        },
      ],
      documentsByUrl,
    );

    expect(results.map((result) => result.url)).toEqual([
      primaryUrl,
      relationshipUrl,
      secondaryUrl,
    ]);
  });

  test("classification scope prefers exact matches, then descendants, then direct relationships", () => {
    const primaryUrl = "/docs/concepts/neural-components";
    const descendantUrl = "/docs/modules/relu";
    const relationshipUrl = "/docs/concepts/activation";
    const documentsByUrl = new Map<string, SearchDocument>([
      [
        relationshipUrl,
        documentForUrl(relationshipUrl, {
          topology: {
            primaryClassificationId: "classification.activation-functions",
            secondaryClassificationIds: [],
            primaryClassification: {
              id: "classification.activation-functions",
              slug: "activation-functions",
              label: "activation functions",
              aliases: ["activation family"],
              terms: ["activation-functions", "activation family"],
            },
            secondaryClassifications: [],
            ancestorClassificationIds: [],
            ancestorClassifications: [],
            relationships: [
              {
                relationshipType: "part-of",
                targetId: "classification.neural-network-components",
                targetSlug: "neural-network-components",
                targetAliases: ["network components"],
              },
            ],
            terms: [
              "activation-functions",
              "neural-network-components",
              "network components",
            ],
          },
        }),
      ],
      [
        descendantUrl,
        documentForUrl(descendantUrl, {
          topology: {
            primaryClassificationId: "classification.activation-functions",
            secondaryClassificationIds: [],
            primaryClassification: {
              id: "classification.activation-functions",
              slug: "activation-functions",
              label: "activation functions",
              aliases: ["activation family"],
              terms: ["activation-functions", "activation family"],
            },
            secondaryClassifications: [],
            ancestorClassificationIds: [
              "classification.neural-network-components",
            ],
            ancestorClassifications: [
              {
                id: "classification.neural-network-components",
                slug: "neural-network-components",
                label: "neural network components",
                aliases: ["network components"],
                terms: ["neural-network-components", "network components"],
              },
            ],
            relationships: [],
            terms: [
              "activation-functions",
              "neural-network-components",
              "network components",
            ],
          },
        }),
      ],
      [
        primaryUrl,
        documentForUrl(primaryUrl, {
          topology: {
            primaryClassificationId: "classification.neural-network-components",
            secondaryClassificationIds: [],
            primaryClassification: {
              id: "classification.neural-network-components",
              slug: "neural-network-components",
              label: "neural network components",
              aliases: ["network components"],
              terms: ["neural-network-components", "network components"],
            },
            secondaryClassifications: [],
            ancestorClassificationIds: [],
            ancestorClassifications: [],
            relationships: [],
            terms: ["neural-network-components", "network components"],
          },
        }),
      ],
    ]);

    const results = rerankSearchResults(
      "neural network components",
      [
        {
          id: "relationship",
          type: "page",
          url: relationshipUrl,
          content: "Activation",
        },
        {
          id: "descendant",
          type: "page",
          url: descendantUrl,
          content: "ReLU",
        },
        {
          id: "primary",
          type: "page",
          url: primaryUrl,
          content: "Neural network components",
        },
      ],
      documentsByUrl,
      {
        classificationScope: {
          id: "classification.neural-network-components",
          slug: "neural-network-components",
          label: "neural network components",
          requested: "neural-network-components",
          terms: ["neural-network-components", "network components"],
          query: "neural-network-components network components",
        },
      },
    );

    expect(results.map((result) => result.url)).toEqual([
      primaryUrl,
      descendantUrl,
      relationshipUrl,
    ]);
  });
});
