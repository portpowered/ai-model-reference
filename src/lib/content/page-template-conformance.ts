import { readFileSync } from "node:fs";
import { join, relative } from "node:path";
import { getProjectRoot } from "./content-paths";
import type { PageKind } from "./schemas";
import { splitMdxFrontmatter } from "./validate-canonical-mdx-prose";
import type { ValidationError } from "./validate-registry";

type SectionStructure = {
  id: string;
  titleKey: string;
  components: string[];
};

type PageTemplateStructure = {
  topLevelComponents: string[];
  sections: SectionStructure[];
};

type SupportedTemplateKind = "module" | "paper";

const supportedTemplateKinds = new Set<SupportedTemplateKind>([
  "module",
  "paper",
]);

const ignoredStructuralComponents = new Set(["Section", "T"]);

const pageTemplateConformanceExceptions: Record<string, string> = {
  "modules/absolute-positional-embeddings/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/alibi/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/attention/page.mdx":
    "Legacy module overview predates the current full module template.",
  "modules/batch-norm/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/feed-forward-network/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/group-norm/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/grouped-query-attention/page.mdx":
    "Legacy module page predates the variants-and-nearby-modules section.",
  "modules/layer-norm/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/leaky-relu/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/learned-positional-embeddings/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/linear-attention/page.mdx":
    "Legacy module page predates the variants-and-nearby-modules section.",
  "modules/longrope/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/mixture-of-experts/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/multi-head-attention/page.mdx":
    "Legacy module page still uses the older attention schema component shape.",
  "modules/multi-head-latent-attention/page.mdx":
    "Legacy module page predates the variants-and-nearby-modules section.",
  "modules/multi-query-attention/page.mdx":
    "Legacy module page predates the variants-and-nearby-modules section and still uses the older attention schema comparison component.",
  "modules/nope/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/ntk-aware-rope-scaling/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/positional-interpolation/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/qk-norm/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/relative-position-bias/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/relu/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/rmsnorm/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/rope/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/silu/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/sinusoidal-positional-embeddings/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/sliding-window-attention/page.mdx":
    "Legacy module page predates the variants-and-nearby-modules section.",
  "modules/sparse-attention/page.mdx":
    "Legacy module page predates the variants-and-nearby-modules section.",
  "modules/standard-ffn/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/superhot-rope/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/swiglu/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/t5-relative-position-bias/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
  "modules/yarn/page.mdx":
    "Legacy module migration still uses the older glossary-shaped structure.",
};

const templateStructureCache = new Map<
  SupportedTemplateKind,
  PageTemplateStructure
>();

function isSupportedTemplateKind(
  kind: PageKind,
): kind is SupportedTemplateKind {
  return supportedTemplateKinds.has(kind as SupportedTemplateKind);
}

function templatePathForKind(kind: SupportedTemplateKind): string {
  return join(getProjectRoot(), "docs", "templates", `${kind}.mdx`);
}

function extractAttributeValue(
  tagSource: string,
  attributeName: string,
): string | undefined {
  const match = tagSource.match(new RegExp(`\\b${attributeName}="([^"]+)"`));
  return match?.[1];
}

function extractComponentNames(source: string): string[] {
  const components: string[] = [];
  for (const match of source.matchAll(/<([A-Z][A-Za-z0-9]*)\b/g)) {
    const componentName = match[1];
    if (!componentName || ignoredStructuralComponents.has(componentName)) {
      continue;
    }
    components.push(componentName);
  }
  return components;
}

function extractSectionStructures(mdxBody: string): SectionStructure[] {
  const sections: SectionStructure[] = [];
  const sectionPattern = /<Section\b([\s\S]*?)>([\s\S]*?)<\/Section>/g;

  for (const match of mdxBody.matchAll(sectionPattern)) {
    const tagAttributes = match[1] ?? "";
    const sectionBody = match[2] ?? "";
    const id = extractAttributeValue(tagAttributes, "id");
    const titleKey = extractAttributeValue(tagAttributes, "titleKey");

    if (!id || !titleKey) {
      continue;
    }

    sections.push({
      id,
      titleKey,
      components: extractComponentNames(sectionBody),
    });
  }

  return sections;
}

function extractTemplateStructure(mdxSource: string): PageTemplateStructure {
  const { body } = splitMdxFrontmatter(mdxSource);
  const withoutImports = body.replace(/^import\s+.+$/gm, "");
  const sections = extractSectionStructures(withoutImports);
  const topLevelBody = withoutImports.replace(
    /<Section\b[\s\S]*?<\/Section>/g,
    "",
  );

  return {
    topLevelComponents: extractComponentNames(topLevelBody),
    sections,
  };
}

function readTemplateStructure(
  kind: SupportedTemplateKind,
): PageTemplateStructure {
  const cached = templateStructureCache.get(kind);
  if (cached) {
    return cached;
  }

  const structure = extractTemplateStructure(
    readFileSync(templatePathForKind(kind), "utf8"),
  );
  templateStructureCache.set(kind, structure);
  return structure;
}

function formatComponentList(components: string[]): string {
  return components.length > 0 ? components.join(", ") : "(none)";
}

function pagePathRelativeToDocsRoot(
  pagePath: string,
  docsRoot: string,
): string {
  return relative(docsRoot, pagePath).replace(/\\/g, "/");
}

export function validatePageTemplateConformance(options: {
  pagePath: string;
  docsRoot: string;
  kind: PageKind;
  mdxSource: string;
}): ValidationError[] {
  const { pagePath, docsRoot, kind, mdxSource } = options;

  if (!isSupportedTemplateKind(kind)) {
    return [];
  }

  const relativePagePath = pagePathRelativeToDocsRoot(pagePath, docsRoot);
  const exceptionReason = pageTemplateConformanceExceptions[relativePagePath];
  if (exceptionReason) {
    return [];
  }

  const expected = readTemplateStructure(kind);
  const actual = extractTemplateStructure(mdxSource);
  const errors: ValidationError[] = [];

  if (
    JSON.stringify(actual.topLevelComponents) !==
    JSON.stringify(expected.topLevelComponents)
  ) {
    errors.push({
      code: "page-template-top-level-components-mismatch",
      message: `${pagePath}: ${kind} page top-level components must match docs/templates/${kind}.mdx; expected ${formatComponentList(expected.topLevelComponents)}, found ${formatComponentList(actual.topLevelComponents)}`,
      path: pagePath,
    });
  }

  const expectedSectionIds = expected.sections.map((section) => section.id);
  const actualSectionIds = actual.sections.map((section) => section.id);
  if (JSON.stringify(actualSectionIds) !== JSON.stringify(expectedSectionIds)) {
    errors.push({
      code: "page-template-section-order-mismatch",
      message: `${pagePath}: ${kind} page sections must match docs/templates/${kind}.mdx; expected [${expectedSectionIds.join(", ")}], found [${actualSectionIds.join(", ")}]`,
      path: pagePath,
    });
  }

  for (const expectedSection of expected.sections) {
    const actualSection = actual.sections.find(
      (section) => section.id === expectedSection.id,
    );

    if (!actualSection) {
      continue;
    }

    if (actualSection.titleKey !== expectedSection.titleKey) {
      errors.push({
        code: "page-template-title-key-mismatch",
        message: `${pagePath}: section "${expectedSection.id}" must use titleKey "${expectedSection.titleKey}" to match docs/templates/${kind}.mdx; found "${actualSection.titleKey}"`,
        path: pagePath,
      });
    }

    if (
      JSON.stringify(actualSection.components) !==
      JSON.stringify(expectedSection.components)
    ) {
      errors.push({
        code: "page-template-section-components-mismatch",
        message: `${pagePath}: section "${expectedSection.id}" must match docs/templates/${kind}.mdx component structure; expected ${formatComponentList(expectedSection.components)}, found ${formatComponentList(actualSection.components)}`,
        path: pagePath,
      });
    }
  }

  return errors;
}
