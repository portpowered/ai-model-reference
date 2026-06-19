import { describe, expect, test } from "bun:test";
import {
  deriveDefaultSummaryKey,
  deriveDefaultTitleKey,
  derivePageFrontmatter,
  PageSpecValidationError,
  parsePageSpecJson,
  registryIdForPageSpec,
  registryKindForPageSpec,
  validatePageSpec,
} from "./page-spec";

const baseFields = {
  slug: "example-page",
  title: "Example Page",
  summary: "Short summary for search and cards.",
};

describe("validatePageSpec", () => {
  test("accepts shared optional content fields for canonical bundle generation", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "concept",
      conceptType: "architecture",
      relatedIds: ["concept.token"],
      citationIds: ["citation.example"],
      callouts: {
        keyIdea: {
          title: "Key idea",
          body: "One compact page spec drives the whole bundle.",
        },
      },
      graph: {
        nodes: {
          input: {
            label: "Page spec",
            summary: "Declarative input.",
          },
        },
      },
    });

    const callouts = spec.callouts as
      | Record<string, { body: string }>
      | undefined;
    const graph = spec.graph as
      | { nodes: Record<string, { label: string }> }
      | undefined;

    expect(spec.relatedIds).toEqual(["concept.token"]);
    expect(spec.citationIds).toEqual(["citation.example"]);
    expect(callouts?.keyIdea?.body).toContain("compact page spec");
    expect(graph?.nodes.input?.label).toBe("Page spec");
  });

  test("accepts a valid concept page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "concept",
      conceptType: "architecture",
      tags: ["attention"],
      sections: {
        whatItIs: {
          title: "What It Is",
          body: "Concept body copy.",
        },
      },
      assetMessages: {
        conceptMap: {
          alt: "Diagram alt from page spec.",
          caption: "Caption from page spec.",
        },
      },
    });

    expect(spec.kind).toBe("concept");
    expect(registryIdForPageSpec(spec)).toBe("concept.example-page");
    expect(registryKindForPageSpec(spec)).toBe("concept");
    if (spec.kind === "concept") {
      const assetMessages = spec.assetMessages as
        | Record<string, { alt?: string }>
        | undefined;

      expect(assetMessages?.conceptMap?.alt).toBe(
        "Diagram alt from page spec.",
      );
    }
  });

  test("accepts a valid glossary page spec with concept registry kind", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "glossary",
      conceptType: "general",
    });

    expect(spec.kind).toBe("glossary");
    expect(registryIdForPageSpec(spec)).toBe("concept.example-page");
    expect(registryKindForPageSpec(spec)).toBe("concept");
  });

  test("accepts a valid module page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "module",
      releaseDate: "2023-05-01",
      authors: ["Joshua Ainslie"],
      sourceId: "citation.gqa-paper",
      moduleType: "attention",
      assets: {
        computeFlow: {
          type: "graph",
          graphId: "graph.example-module-compute-flow",
          webRenderer: "react-flow",
          printRenderer: "mermaid",
        },
      },
    });

    expect(spec.kind).toBe("module");
    if (spec.kind === "module") {
      expect(spec.moduleType).toBe("attention");
      expect(spec.releaseDate).toBe("2023-05-01");
      expect(spec.sourceId).toBe("citation.gqa-paper");
      expect(spec.assets?.computeFlow.type).toBe("graph");
    }
  });

  test("accepts a valid model page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "model",
      family: "gpt",
      sourceType: "open-weights",
      modalities: ["text"],
    });

    expect(spec.kind).toBe("model");
    if (spec.kind === "model") {
      expect(spec.family).toBe("gpt");
    }
    expect(registryIdForPageSpec(spec)).toBe("model.example-page");
  });

  test("accepts a valid paper page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "paper",
      authors: ["A. Author"],
      publishedAt: "2024-01-01",
      url: "https://example.com/paper",
      citationIds: ["citation.example-paper"],
    });

    expect(spec.kind).toBe("paper");
    if (spec.kind === "paper") {
      expect(spec.authors).toEqual(["A. Author"]);
    }
    expect(registryIdForPageSpec(spec)).toBe("paper.example-page");
  });

  test("accepts a valid training-regime page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "training-regime",
      regimeType: "pretraining",
      relatedIds: ["model.example-model"],
    });

    expect(spec.kind).toBe("training-regime");
    if (spec.kind === "training-regime") {
      expect(spec.regimeType).toBe("pretraining");
    }
    expect(registryIdForPageSpec(spec)).toBe("training-regime.example-page");
  });

  test("accepts a valid system page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "system",
      systemType: "serving",
      relatedModelIds: ["model.example-model"],
    });

    expect(spec.kind).toBe("system");
    if (spec.kind === "system") {
      expect(spec.systemType).toBe("serving");
    }
    expect(registryIdForPageSpec(spec)).toBe("system.example-page");
  });

  test("derives canonical frontmatter fields from a page spec", () => {
    const spec = validatePageSpec({
      ...baseFields,
      kind: "module",
      moduleType: "attention",
      aliases: ["GQA"],
      tags: ["attention", "kv-cache"],
      status: "published",
    });

    expect(derivePageFrontmatter(spec, "2026-06-11")).toEqual({
      kind: "module",
      registryId: "module.example-page",
      messageNamespace: "local",
      assetNamespace: "local",
      tags: ["attention", "kv-cache"],
      aliases: ["GQA"],
      status: "published",
      updatedAt: "2026-06-11",
    });
    expect(deriveDefaultTitleKey()).toBe("title");
    expect(deriveDefaultSummaryKey()).toBe("description");
  });

  test("reports missing conceptType for concept pages", () => {
    expect(() =>
      validatePageSpec({
        ...baseFields,
        kind: "concept",
      }),
    ).toThrow(PageSpecValidationError);

    try {
      validatePageSpec({
        ...baseFields,
        kind: "concept",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      expect(
        validationError.issues.some((issue) => issue.field === "conceptType"),
      ).toBe(true);
    }
  });

  test("reports missing moduleType for module pages", () => {
    try {
      validatePageSpec({
        ...baseFields,
        kind: "module",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      expect(
        validationError.issues.some((issue) => issue.field === "moduleType"),
      ).toBe(true);
    }
  });

  test("reports missing model family and modalities", () => {
    try {
      validatePageSpec({
        ...baseFields,
        kind: "model",
        sourceType: "research",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      const fields = validationError.issues.map((issue) => issue.field);
      expect(fields).toContain("family");
      expect(fields).toContain("modalities");
    }
  });

  test("reports missing paper source metadata", () => {
    try {
      validatePageSpec({
        ...baseFields,
        kind: "paper",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      const fields = validationError.issues.map((issue) => issue.field);
      expect(fields).toContain("authors");
      expect(fields).toContain("publishedAt");
      expect(fields).toContain("url");
    }
  });

  test("reports missing regimeType for training-regime pages", () => {
    try {
      validatePageSpec({
        ...baseFields,
        kind: "training-regime",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      expect(
        validationError.issues.some((issue) => issue.field === "regimeType"),
      ).toBe(true);
    }
  });

  test("reports missing systemType for system pages", () => {
    try {
      validatePageSpec({
        ...baseFields,
        kind: "system",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      expect(
        validationError.issues.some((issue) => issue.field === "systemType"),
      ).toBe(true);
    }
  });

  test("reports invalid slug without writing files", () => {
    try {
      validatePageSpec({
        ...baseFields,
        slug: "Invalid Slug",
        kind: "concept",
        conceptType: "general",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      expect(
        validationError.issues.some((issue) => issue.field === "slug"),
      ).toBe(true);
    }
  });
});

describe("parsePageSpecJson", () => {
  test("parses JSON and surfaces JSON syntax errors on pageSpec", () => {
    expect(() => parsePageSpecJson("{")).toThrow(PageSpecValidationError);

    try {
      parsePageSpecJson("{");
    } catch (error) {
      expect(error).toBeInstanceOf(PageSpecValidationError);
      const validationError = error as PageSpecValidationError;
      expect(validationError.issues[0]?.field).toBe("pageSpec");
    }
  });
});
