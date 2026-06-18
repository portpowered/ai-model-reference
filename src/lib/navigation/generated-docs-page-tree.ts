import type { Node, Root } from "fumadocs-core/page-tree";
import {
  type DocsPageSource,
  loadPublishedDocsPagesSync,
} from "@/lib/content/pages";
import {
  getConceptById,
  getModuleById,
  getSystemById,
  getTrainingRegimeById,
} from "@/lib/content/registry-runtime";

type SectionKey =
  | "glossary"
  | "concepts"
  | "modules"
  | "models"
  | "papers"
  | "training"
  | "systems";

type GroupDefinition = {
  name: string;
  match: (page: DocsPageSource) => boolean;
};

const SECTION_ORDER: readonly SectionKey[] = [
  "glossary",
  "concepts",
  "modules",
  "models",
  "papers",
  "training",
  "systems",
];

const SECTION_TITLES: Record<SectionKey, string> = {
  glossary: "Glossary",
  concepts: "Concepts",
  modules: "Modules",
  models: "Models",
  papers: "Papers",
  training: "Training",
  systems: "Systems",
};

const GLOSSARY_SEQUENCE_AND_ATTENTION_SLUGS = new Set([
  "context-window",
  "decoder",
  "decode",
  "encoder",
  "encoder-decoder",
  "hidden-size",
  "kv-cache",
  "normalization",
  "prefill",
  "prefill-decode-split",
  "perplexity",
  "residual-connection",
  "skip-connection",
  "token",
  "transformer",
]);

const GLOSSARY_GENERATION_AND_DIFFUSION_SLUGS = new Set([
  "autoregressive-generation",
  "greedy-decoding",
  "sampling-overview",
  "top-k-sampling",
  "top-p-sampling",
  "conditioning",
  "denoising-generation",
  "diffusion-model",
]);

const GLOSSARY_MATH_AND_TRAINING_SLUGS = new Set(["activation", "embedding"]);

const MODULE_ATTENTION_FOUNDATION_SLUGS = new Set([
  "attention",
  "multi-head-attention",
]);

const MODULE_ATTENTION_VARIANT_SLUGS = new Set([
  "manifold-constrained-hyper-connections",
]);

const CONCEPT_LONG_CONTEXT_SLUGS = new Set([
  "context-extension",
  "positional-encodings",
  "why-long-context-is-hard",
]);

const CONCEPT_ARCHITECTURE_SLUGS = new Set(["transformer-architecture"]);

const CONCEPT_REFERENCE_SAMPLE_SLUGS = new Set(["page-spec-workflow-sample"]);

function createPageNode(page: DocsPageSource): Node {
  return {
    type: "page",
    name: page.messages.title,
    url: page.url,
  };
}

function createSeparator(name: string): Node {
  return {
    type: "separator",
    name,
  };
}

function sortPages(pages: DocsPageSource[]): DocsPageSource[] {
  return [...pages].sort((left, right) =>
    left.messages.title.localeCompare(right.messages.title, "en", {
      sensitivity: "base",
    }),
  );
}

function groupPages(
  pages: DocsPageSource[],
  groups: readonly GroupDefinition[],
): Node[] {
  const remaining = new Set(pages.map((page) => page.docsSlug));
  const nodes: Node[] = [];

  for (const group of groups) {
    const groupedPages = sortPages(
      pages.filter((page) => remaining.has(page.docsSlug) && group.match(page)),
    );
    if (groupedPages.length === 0) {
      continue;
    }

    nodes.push(createSeparator(group.name));
    for (const page of groupedPages) {
      remaining.delete(page.docsSlug);
      nodes.push(createPageNode(page));
    }
  }

  for (const page of sortPages(
    pages.filter((page) => remaining.has(page.docsSlug)),
  )) {
    nodes.push(createPageNode(page));
  }

  return nodes;
}

function generateGlossaryNodes(pages: DocsPageSource[]): Node[] {
  return groupPages(pages, [
    {
      name: "Model Taxonomy",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        if (!record) {
          return false;
        }
        return (
          !GLOSSARY_SEQUENCE_AND_ATTENTION_SLUGS.has(record.slug) &&
          !GLOSSARY_GENERATION_AND_DIFFUSION_SLUGS.has(record.slug) &&
          !GLOSSARY_MATH_AND_TRAINING_SLUGS.has(record.slug) &&
          record.conceptType !== "math" &&
          record.conceptType !== "training" &&
          record.conceptType !== "evaluation" &&
          record.conceptType !== "inference"
        );
      },
    },
    {
      name: "Sequence And Attention",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        return record
          ? GLOSSARY_SEQUENCE_AND_ATTENTION_SLUGS.has(record.slug)
          : false;
      },
    },
    {
      name: "Math And Training",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        if (!record) {
          return false;
        }
        return (
          GLOSSARY_MATH_AND_TRAINING_SLUGS.has(record.slug) ||
          record.conceptType === "math" ||
          record.conceptType === "training" ||
          record.conceptType === "evaluation"
        );
      },
    },
    {
      name: "Generation And Diffusion",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        return record
          ? GLOSSARY_GENERATION_AND_DIFFUSION_SLUGS.has(record.slug)
          : false;
      },
    },
  ]);
}

function generateConceptNodes(pages: DocsPageSource[]): Node[] {
  return groupPages(pages, [
    {
      name: "Long Context",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        return record ? CONCEPT_LONG_CONTEXT_SLUGS.has(record.slug) : false;
      },
    },
    {
      name: "Inference",
      match: (page) =>
        getConceptById(page.frontmatter.registryId)?.conceptType ===
        "inference",
    },
    {
      name: "Architecture",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        return record ? CONCEPT_ARCHITECTURE_SLUGS.has(record.slug) : false;
      },
    },
    {
      name: "Reference Samples",
      match: (page) => {
        const record = getConceptById(page.frontmatter.registryId);
        return record ? CONCEPT_REFERENCE_SAMPLE_SLUGS.has(record.slug) : false;
      },
    },
  ]);
}

function generateModuleNodes(pages: DocsPageSource[]): Node[] {
  return groupPages(pages, [
    {
      name: "Attention Foundations",
      match: (page) => {
        const record = getModuleById(page.frontmatter.registryId);
        return record
          ? MODULE_ATTENTION_FOUNDATION_SLUGS.has(record.slug)
          : false;
      },
    },
    {
      name: "Attention Variants",
      match: (page) => {
        const record = getModuleById(page.frontmatter.registryId);
        if (!record) {
          return false;
        }
        return (
          MODULE_ATTENTION_VARIANT_SLUGS.has(record.slug) ||
          (record.moduleType === "attention" &&
            !MODULE_ATTENTION_FOUNDATION_SLUGS.has(record.slug))
        );
      },
    },
    {
      name: "Feed-Forward And Activation",
      match: (page) => {
        const record = getModuleById(page.frontmatter.registryId);
        return (
          record?.moduleType === "feed-forward" ||
          record?.moduleType === "activation"
        );
      },
    },
    {
      name: "Normalization",
      match: (page) =>
        getModuleById(page.frontmatter.registryId)?.moduleType ===
        "normalization",
    },
    {
      name: "Positional And Sequence Encoding",
      match: (page) =>
        getModuleById(page.frontmatter.registryId)?.moduleType ===
        "position-encoding",
    },
  ]);
}

function generateTrainingNodes(pages: DocsPageSource[]): Node[] {
  return groupPages(pages, [
    {
      name: "Post-Training",
      match: (page) =>
        getTrainingRegimeById(page.frontmatter.registryId)?.regimeType ===
        "post-training",
    },
    {
      name: "Distillation",
      match: (page) =>
        getTrainingRegimeById(page.frontmatter.registryId)?.regimeType ===
        "distillation",
    },
    {
      name: "Optimization",
      match: (page) =>
        getTrainingRegimeById(page.frontmatter.registryId)?.regimeType ===
        "optimization",
    },
  ]);
}

function generateSystemNodes(pages: DocsPageSource[]): Node[] {
  return groupPages(pages, [
    {
      name: "Memory",
      match: (page) =>
        getSystemById(page.frontmatter.registryId)?.systemType === "memory",
    },
    {
      name: "Routing",
      match: (page) =>
        getSystemById(page.frontmatter.registryId)?.systemType === "routing",
    },
  ]);
}

function generateModelNodes(pages: DocsPageSource[]): Node[] {
  return sortPages(pages).map(createPageNode);
}

function generatePaperNodes(pages: DocsPageSource[]): Node[] {
  return sortPages(pages).map(createPageNode);
}

function generateSectionNodes(
  section: SectionKey,
  pages: DocsPageSource[],
): Node[] {
  switch (section) {
    case "glossary":
      return generateGlossaryNodes(pages);
    case "concepts":
      return generateConceptNodes(pages);
    case "modules":
      return generateModuleNodes(pages);
    case "models":
      return generateModelNodes(pages);
    case "papers":
      return generatePaperNodes(pages);
    case "training":
      return generateTrainingNodes(pages);
    case "systems":
      return generateSystemNodes(pages);
  }
}

export function buildGeneratedDocsPageTree(baseTree: Root): Root {
  const pages = loadPublishedDocsPagesSync("en");
  const pagesBySection = new Map<SectionKey, DocsPageSource[]>(
    SECTION_ORDER.map((section) => [section, []]),
  );

  for (const page of pages) {
    const [section] = page.docsSlug.split("/", 1);
    if (
      section === "glossary" ||
      section === "concepts" ||
      section === "modules" ||
      section === "models" ||
      section === "papers" ||
      section === "training" ||
      section === "systems"
    ) {
      pagesBySection.get(section)?.push(page);
    }
  }

  const gettingStarted = baseTree.children.find(
    (node) =>
      node.type === "page" &&
      "url" in node &&
      node.url === "/docs/getting-started",
  );

  const children: Node[] = [];
  if (gettingStarted) {
    children.push(gettingStarted);
  }

  for (const section of SECTION_ORDER) {
    children.push({
      type: "folder",
      name: SECTION_TITLES[section],
      children: generateSectionNodes(
        section,
        pagesBySection.get(section) ?? [],
      ),
    });
  }

  return {
    ...baseTree,
    children,
  };
}
