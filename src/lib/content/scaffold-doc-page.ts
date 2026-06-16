import { access, mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import type { z } from "zod";
import {
  getConceptsDocsRoot,
  getContentRoot,
  getGlossaryDocsRoot,
  getProjectRoot,
  getRegistryRoot,
} from "./content-paths";
import { conceptTypeSchema } from "./schemas";
import { parseYamlFrontmatterBlock } from "./yaml-frontmatter";

type ConceptType = z.infer<typeof conceptTypeSchema>;

export const SCAFFOLD_DOC_PAGE_KINDS = ["glossary", "concept"] as const;

export type ScaffoldDocPageKind = (typeof SCAFFOLD_DOC_PAGE_KINDS)[number];

export type ScaffoldDocPageInput = {
  kind: ScaffoldDocPageKind;
  slug: string;
  title: string;
  conceptType: ConceptType;
  tags?: string[];
  relatedIds?: string[];
  citationIds?: string[];
  aliases?: string[];
  dryRun?: boolean;
  projectRoot?: string;
};

export type ScaffoldPlannedFile = {
  path: string;
  label: string;
};

export type ScaffoldDocPageResult = {
  registryId: string;
  plannedFiles: ScaffoldPlannedFile[];
  writtenFiles: string[];
};

const TEMPLATE_ROOT_SEGMENTS = ["docs", "templates"] as const;

const templatePlaceholders: Record<
  ScaffoldDocPageKind,
  { registryId: string; graphId: string; exampleSlug: string }
> = {
  glossary: {
    registryId: "concept.example-glossary",
    graphId: "graph.example-glossary-map",
    exampleSlug: "example-glossary",
  },
  concept: {
    registryId: "concept.example-concept",
    graphId: "graph.example-concept-map",
    exampleSlug: "example-concept",
  },
};

const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export class ScaffoldDocPageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ScaffoldDocPageError";
  }
}

function splitCsvList(value: string | undefined): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function parseScaffoldDocPageArgv(argv: string[]): ScaffoldDocPageInput {
  const options: Record<string, string | boolean> = {};
  const positional: string[] = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--dry-run") {
      options.dryRun = true;
      continue;
    }
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = argv[index + 1];
      if (!next || next.startsWith("--")) {
        throw new ScaffoldDocPageError(`Missing value for --${key}`);
      }
      options[key] = next;
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    throw new ScaffoldDocPageError(
      `Unexpected positional arguments: ${positional.join(" ")}`,
    );
  }

  const kind = options.kind;
  if (kind !== "glossary" && kind !== "concept") {
    throw new ScaffoldDocPageError(
      'Required flag --kind must be "glossary" or "concept"',
    );
  }

  const slug = options.slug;
  const title = options.title;
  const conceptTypeRaw = options["concept-type"];

  if (typeof slug !== "string" || slug.length === 0) {
    throw new ScaffoldDocPageError("Required flag --slug is missing");
  }
  if (typeof title !== "string" || title.length === 0) {
    throw new ScaffoldDocPageError("Required flag --title is missing");
  }
  if (typeof conceptTypeRaw !== "string" || conceptTypeRaw.length === 0) {
    throw new ScaffoldDocPageError("Required flag --concept-type is missing");
  }

  const conceptType = conceptTypeSchema.safeParse(conceptTypeRaw);
  if (!conceptType.success) {
    throw new ScaffoldDocPageError(
      `Invalid --concept-type "${conceptTypeRaw}". Expected one of: ${conceptTypeSchema.options.join(", ")}`,
    );
  }

  return {
    kind,
    slug,
    title,
    conceptType: conceptType.data,
    tags: splitCsvList(
      typeof options.tags === "string" ? options.tags : undefined,
    ),
    relatedIds: splitCsvList(
      typeof options["related-ids"] === "string"
        ? options["related-ids"]
        : undefined,
    ),
    citationIds: splitCsvList(
      typeof options["citation-ids"] === "string"
        ? options["citation-ids"]
        : undefined,
    ),
    aliases: splitCsvList(
      typeof options.aliases === "string" ? options.aliases : undefined,
    ),
    dryRun: options.dryRun === true,
  };
}

export function formatScaffoldUsage(): string {
  return [
    "Usage: bun ./scripts/scaffold-doc-page.ts [options]",
    "",
    "Prefer bun ./scripts/generate-page-bundle.ts --spec <page-spec.json> for new",
    "concept and glossary pages so title, summary, sections, and assets stay aligned.",
    "",
    "Required:",
    "  --kind glossary|concept",
    "  --slug <kebab-case-slug>",
    "  --title <reader-facing title>",
    "  --concept-type <architecture|math|training|inference|systems|evaluation|general>",
    "",
    "Optional:",
    "  --tags <comma-separated tag slugs>",
    "  --related-ids <comma-separated registry ids>",
    "  --citation-ids <comma-separated citation ids>",
    "  --aliases <comma-separated aliases>",
    "  --dry-run  Print planned paths without writing files",
  ].join("\n");
}

function assertValidSlug(slug: string): void {
  if (!SLUG_PATTERN.test(slug)) {
    throw new ScaffoldDocPageError(
      `Invalid slug "${slug}". Use lowercase letters, digits, and single hyphens.`,
    );
  }
}

function registryIdForSlug(slug: string): string {
  return `concept.${slug}`;
}

function graphIdForSlug(slug: string): string {
  return `graph.${slug}-concept-map`;
}

function isoTimestampUtc(): string {
  return new Date().toISOString();
}

function isoDateUtc(): string {
  return new Date().toISOString().slice(0, 10);
}

function applyTemplateSubstitutions(
  content: string,
  kind: ScaffoldDocPageKind,
  slug: string,
): string {
  const placeholders = templatePlaceholders[kind];
  const registryId = registryIdForSlug(slug);
  const graphId = graphIdForSlug(slug);

  return content
    .replaceAll(placeholders.registryId, registryId)
    .replaceAll(placeholders.graphId, graphId);
}

function yamlQuote(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function serializeYamlList(key: string, values: string[]): string[] {
  if (values.length === 0) {
    return [`${key}:`];
  }
  return [`${key}:`, ...values.map((value) => `  - ${yamlQuote(value)}`)];
}

function buildGlossaryFrontmatter(input: ScaffoldDocPageInput): string {
  const registryId = registryIdForSlug(input.slug);
  const lines = [
    `title: ${yamlQuote(input.title)}`,
    'description: ""',
    'kind: "glossary"',
    `registryId: ${yamlQuote(registryId)}`,
    'messageNamespace: "local"',
    'assetNamespace: "local"',
    'status: "draft"',
    ...serializeYamlList("tags", input.tags ?? []),
    ...(input.aliases && input.aliases.length > 0
      ? serializeYamlList("aliases", input.aliases)
      : []),
    `updatedAt: ${yamlQuote(isoDateUtc())}`,
  ];
  return lines.join("\n");
}

function buildConceptFrontmatter(input: ScaffoldDocPageInput): string {
  const registryId = registryIdForSlug(input.slug);
  const lines = [
    'kind: "concept"',
    `registryId: ${yamlQuote(registryId)}`,
    'messageNamespace: "local"',
    'assetNamespace: "local"',
    'status: "draft"',
    ...serializeYamlList("tags", input.tags ?? []),
    ...(input.aliases && input.aliases.length > 0
      ? serializeYamlList("aliases", input.aliases)
      : []),
    `updatedAt: ${yamlQuote(isoDateUtc())}`,
  ];
  return lines.join("\n");
}

function buildPageMdx(
  templateMdx: string,
  input: ScaffoldDocPageInput,
): string {
  const match = templateMdx.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match?.[2]) {
    throw new ScaffoldDocPageError("Template page.mdx is missing frontmatter");
  }

  const frontmatter =
    input.kind === "glossary"
      ? buildGlossaryFrontmatter(input)
      : buildConceptFrontmatter(input);

  const body = applyTemplateSubstitutions(match[2], input.kind, input.slug);
  return `---\n${frontmatter}\n---\n\n${body}`;
}

function fillEmptyDraftStrings(value: unknown, draftNote: string): unknown {
  if (typeof value === "string") {
    return value.length === 0 ? draftNote : value;
  }
  if (Array.isArray(value)) {
    return value.map((item) => fillEmptyDraftStrings(item, draftNote));
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value).map(([key, nested]) => [
        key,
        fillEmptyDraftStrings(nested, draftNote),
      ]),
    );
  }
  return value;
}

function applyDraftScaffoldMessages(
  messages: Record<string, unknown>,
  title: string,
): void {
  const draftNote = `Draft placeholder for ${title}. Replace before publishing.`;
  const filled = fillEmptyDraftStrings(messages, draftNote) as Record<
    string,
    unknown
  >;
  Object.assign(messages, filled);
  messages.title = title;
}

function buildRegistryRecord(
  input: ScaffoldDocPageInput,
): Record<string, unknown> {
  const timestamp = isoTimestampUtc();
  return {
    id: registryIdForSlug(input.slug),
    slug: input.slug,
    kind: "concept",
    defaultTitleKey: "title",
    defaultSummaryKey: "description",
    aliases: input.aliases ?? [],
    tags: input.tags ?? [],
    relatedIds: input.relatedIds ?? [],
    citationIds: input.citationIds ?? [],
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
    conceptType: input.conceptType,
    prerequisiteIds: [],
    explainsIds: [],
  };
}

async function readTemplateFile(
  projectRoot: string,
  kind: ScaffoldDocPageKind,
  fileName: string,
): Promise<string> {
  const templatePath = join(
    projectRoot,
    ...TEMPLATE_ROOT_SEGMENTS,
    fileName.replace("<kind>", kind),
  );
  return readFile(templatePath, "utf8");
}

async function assertPathDoesNotExist(path: string): Promise<void> {
  try {
    await access(path);
    throw new ScaffoldDocPageError(
      `Refusing to overwrite existing path: ${path}`,
    );
  } catch (error) {
    if (
      error instanceof ScaffoldDocPageError ||
      (error &&
        typeof error === "object" &&
        "code" in error &&
        (error as NodeJS.ErrnoException).code !== "ENOENT")
    ) {
      throw error;
    }
  }
}

export async function scaffoldDocPage(
  input: ScaffoldDocPageInput,
): Promise<ScaffoldDocPageResult> {
  assertValidSlug(input.slug);

  const projectRoot = input.projectRoot ?? getProjectRoot();
  const contentRoot = getContentRoot(projectRoot);
  const docsRoot = join(contentRoot, "docs");
  const registryPath = join(
    getRegistryRoot(contentRoot),
    "concepts",
    `${input.slug}.json`,
  );
  const graphPath = join(
    getRegistryRoot(contentRoot),
    "graphs",
    `${input.slug}-concept-map.json`,
  );
  const pageParent =
    input.kind === "glossary"
      ? getGlossaryDocsRoot(docsRoot)
      : getConceptsDocsRoot(docsRoot);
  const pageDir = join(pageParent, input.slug);
  const pagePath = join(pageDir, "page.mdx");
  const messagesPath = join(pageDir, "messages", "en.json");
  const assetsPath = join(pageDir, "assets.json");

  const plannedFiles: ScaffoldPlannedFile[] = [
    { path: registryPath, label: "registry record" },
    { path: graphPath, label: "graph record" },
    { path: pagePath, label: "page.mdx" },
    { path: messagesPath, label: "messages/en.json" },
    { path: assetsPath, label: "assets.json" },
  ];

  if (input.dryRun) {
    return {
      registryId: registryIdForSlug(input.slug),
      plannedFiles,
      writtenFiles: [],
    };
  }

  for (const file of plannedFiles) {
    await assertPathDoesNotExist(file.path);
  }

  const [
    templateMdx,
    templateMessagesRaw,
    templateAssetsRaw,
    templateGraphRaw,
  ] = await Promise.all([
    readTemplateFile(projectRoot, input.kind, "<kind>.mdx"),
    readTemplateFile(projectRoot, input.kind, "<kind>.messages.en.json"),
    readTemplateFile(projectRoot, input.kind, "<kind>.assets.json"),
    readTemplateFile(projectRoot, input.kind, "<kind>.graph.json"),
  ]);

  const pageMdx = buildPageMdx(templateMdx, input);
  const messages = JSON.parse(templateMessagesRaw) as Record<string, unknown>;
  applyDraftScaffoldMessages(messages, input.title);

  const assetsJson = applyTemplateSubstitutions(
    templateAssetsRaw,
    input.kind,
    input.slug,
  );
  const graphJson = applyTemplateSubstitutions(
    templateGraphRaw,
    input.kind,
    input.slug,
  );

  const registryRecord = buildRegistryRecord(input);

  await mkdir(join(pageDir, "messages"), { recursive: true });
  await mkdir(join(getRegistryRoot(contentRoot), "graphs"), {
    recursive: true,
  });
  await writeFile(registryPath, `${JSON.stringify(registryRecord, null, 2)}\n`);
  await writeFile(
    graphPath,
    graphJson.endsWith("\n") ? graphJson : `${graphJson}\n`,
  );
  await writeFile(pagePath, pageMdx);
  await writeFile(messagesPath, `${JSON.stringify(messages, null, 2)}\n`);
  await writeFile(
    assetsPath,
    assetsJson.endsWith("\n") ? assetsJson : `${assetsJson}\n`,
  );

  return {
    registryId: registryIdForSlug(input.slug),
    plannedFiles,
    writtenFiles: plannedFiles.map((file) => file.path),
  };
}

export function formatScaffoldPlan(result: ScaffoldDocPageResult): string {
  const lines = [
    `Registry id: ${result.registryId}`,
    "Planned files:",
    ...result.plannedFiles.map((file) => `  - ${file.path} (${file.label})`),
  ];
  if (result.writtenFiles.length > 0) {
    lines.push("Written files:");
    for (const path of result.writtenFiles) {
      lines.push(`  - ${path}`);
    }
  }
  return lines.join("\n");
}

/** @internal Test helper to read scaffolded page frontmatter registryId. */
export async function readScaffoldedPageRegistryId(
  pagePath: string,
): Promise<string> {
  const raw = await readFile(pagePath, "utf8");
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!match?.[1]) {
    throw new Error(`Missing frontmatter in ${pagePath}`);
  }
  const frontmatter = parseYamlFrontmatterBlock(match[1]);
  const registryId = frontmatter.registryId;
  if (typeof registryId !== "string") {
    throw new Error(`Missing registryId in ${pagePath}`);
  }
  return registryId;
}
