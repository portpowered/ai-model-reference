import { describe, expect, test } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { validateRegistryContent } from "./validate-registry";

const validModuleRecord = {
  id: "module.grouped-query-attention",
  slug: "grouped-query-attention",
  kind: "module",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["GQA"],
  tags: ["attention"],
  relatedIds: [],
  citationIds: ["citation.gqa-paper"],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  moduleType: "attention",
  optimizes: ["kv-cache"],
  practicalBenefits: ["lower memory"],
  exampleModelIds: [],
  improvesOnIds: [],
  tradeoffIds: [],
  usedByModelIds: [],
  introducedByPaperIds: [],
  mathLevel: "light",
};

const validTagRecord = {
  id: "tag.attention",
  slug: "attention",
  kind: "tag",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: ["self-attention"],
  tags: [],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  category: "module-type",
  landingPage: "generated-tag-page",
};

const validCitationRecord = {
  id: "citation.gqa-paper",
  slug: "gqa-paper",
  kind: "citation",
  defaultTitleKey: "title",
  defaultSummaryKey: "description",
  aliases: [],
  tags: ["attention"],
  relatedIds: [],
  citationIds: [],
  status: "published",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-02T00:00:00.000Z",
  citationType: "paper",
  authors: ["Ainslie et al."],
  title: "GQA: Training Generalized Multi-Query Transformer Models",
  url: "https://arxiv.org/abs/2305.13245",
  mla: 'Ainslie, Joshua, et al. "GQA." arXiv, 2023.',
  year: 2023,
};

describe("validateRegistryContent", () => {
  test("returns no errors for the committed Phase 1 baseline", async () => {
    const errors = await validateRegistryContent();
    expect(errors).toEqual([]);
  });

  test("reports unresolved citation references", async () => {
    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        citationIds: ["citation.missing-paper"],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const docsRoot = join(tempRoot, "docs-empty");
    await mkdir(docsRoot, { recursive: true });

    try {
      const errors = await validateRegistryContent({
        registryRoot,
        docsRoot,
      });
      expect(errors.length).toBeGreaterThan(0);
      expect(
        errors.some((error) =>
          error.message.includes(
            'citationIds references missing record "citation.missing-paper"',
          ),
        ),
      ).toBe(true);
    } finally {
      await rm(tempRoot, { recursive: true, force: true });
    }
  });
});

describe("make validate-data", () => {
  test("succeeds on the committed Phase 1 baseline", async () => {
    const proc = Bun.spawn({
      cmd: ["make", "validate-data"],
      cwd: join(import.meta.dir, "../../.."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const code = await proc.exited;
    expect(code).toBe(0);
  });
});

describe("validate-registry CLI", () => {
  test("exits 0 on baseline and 1 when registry references are broken", async () => {
    const baseline = Bun.spawn({
      cmd: ["bun", "./scripts/validate-registry.ts"],
      cwd: join(import.meta.dir, "../../.."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const baselineCode = await baseline.exited;
    expect(baselineCode).toBe(0);

    const tempRoot = join(import.meta.dir, "__fixtures__", crypto.randomUUID());
    const registryRoot = join(tempRoot, "registry");
    await mkdir(join(registryRoot, "modules"), { recursive: true });
    await mkdir(join(registryRoot, "concepts"), { recursive: true });
    await mkdir(join(registryRoot, "tags"), { recursive: true });
    await mkdir(join(registryRoot, "citations"), { recursive: true });

    await writeFile(
      join(registryRoot, "modules", "grouped-query-attention.json"),
      JSON.stringify({
        ...validModuleRecord,
        citationIds: ["citation.missing-paper"],
      }),
    );
    await writeFile(
      join(registryRoot, "tags", "attention.json"),
      JSON.stringify(validTagRecord),
    );
    await writeFile(
      join(registryRoot, "citations", "gqa-paper.json"),
      JSON.stringify(validCitationRecord),
    );

    const broken = Bun.spawn({
      cmd: [
        "bun",
        "-e",
        `import { validateRegistryContent, formatValidationErrors } from "./src/lib/content/validate-registry.ts";
const errors = await validateRegistryContent({ registryRoot: ${JSON.stringify(registryRoot)}, docsRoot: ${JSON.stringify(join(tempRoot, "docs-empty"))} });
if (errors.length === 0) process.exit(0);
console.error(formatValidationErrors(errors));
process.exit(1);`,
      ],
      cwd: join(import.meta.dir, "../../.."),
      stdout: "pipe",
      stderr: "pipe",
    });
    const brokenCode = await broken.exited;
    expect(brokenCode).toBe(1);

    await rm(tempRoot, { recursive: true, force: true });
  });
});
