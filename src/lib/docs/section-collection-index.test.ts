import { describe, expect, test } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import { renderSectionCollectionIndexPage } from "@/app/(site)/site-renderers";
import { loadShippedLocalizedDocsPages } from "@/lib/content/pages";
import { loadUiMessages } from "@/lib/content/ui-messages";
import type { UiMessages } from "@/lib/content/ui-messages.types";
import type { DocsCollectionDefinition } from "@/lib/docs/collection-definition-contract";
import { getDocsCollectionDefinition } from "@/lib/docs/docs-collection-definitions";
import {
  isDocsCollectionId,
  resolveDocsCollectionIndexMessages,
  resolveDocsCollectionInput,
  resolveSectionKindCollectionId,
} from "@/lib/docs/section-collection-index";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";

const trainingDefinition = getDocsCollectionDefinition("training");

type SectionIndexCollectionId =
  | "models"
  | "modules"
  | "concepts"
  | "papers"
  | "training"
  | "systems";

type SectionIndexMessages = UiMessages["modelsIndex"];

const SECTION_INDEX_MESSAGE_KEYS = {
  models: "modelsIndex",
  modules: "modulesIndex",
  concepts: "conceptsIndex",
  papers: "papersIndex",
  training: "trainingIndex",
  systems: "systemsIndex",
} as const satisfies Record<SectionIndexCollectionId, keyof UiMessages>;

const SECTION_INDEX_RENDER_CASES = [
  {
    collectionId: "models",
    representativeHrefs: ["/docs/models/gpt-3"],
  },
  {
    collectionId: "modules",
    representativeHrefs: [
      "/docs/modules/grouped-query-attention",
      "/docs/modules/swiglu",
    ],
  },
  {
    collectionId: "concepts",
    representativeHrefs: [
      "/docs/concepts/transformer-architecture",
      "/docs/concepts/quantization",
    ],
  },
  {
    collectionId: "papers",
    representativeHrefs: ["/docs/papers/deepseek-v4"],
  },
  {
    collectionId: "training",
    representativeHrefs: [
      "/docs/training/on-policy-distillation",
      "/docs/training/specialist-training",
    ],
  },
  {
    collectionId: "systems",
    representativeHrefs: [
      "/docs/systems/deployment",
      "/docs/systems/routing",
      "/docs/systems/batching",
    ],
  },
] as const satisfies ReadonlyArray<{
  collectionId: SectionIndexCollectionId;
  representativeHrefs: readonly string[];
}>;

function sectionIndexMessages(
  messages: UiMessages,
  collectionId: SectionIndexCollectionId,
): SectionIndexMessages {
  return messages[
    SECTION_INDEX_MESSAGE_KEYS[collectionId]
  ] as SectionIndexMessages;
}

function extractIndexListEntryHrefs(html: string, listLabel: string): string[] {
  const escapedLabel = listLabel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const listMatch = html.match(
    new RegExp(`<ul[^>]*aria-label="${escapedLabel}"[^>]*>([\\s\\S]*?)</ul>`),
  );

  if (!listMatch) {
    return [];
  }

  return [...listMatch[1].matchAll(/href="([^"]+)"/g)].map((match) => match[1]);
}

async function expectedSectionIndexHrefs(
  collectionId: SectionIndexCollectionId,
  locale: SiteLocale = defaultLocale,
): Promise<string[]> {
  const definition = getDocsCollectionDefinition(collectionId);
  const pages = await loadShippedLocalizedDocsPages(locale);

  return pages
    .filter((page) => page.frontmatter.kind === definition.frontmatterKind)
    .sort((left, right) =>
      left.messages.title.localeCompare(right.messages.title, locale, {
        sensitivity: "base",
      }),
    )
    .map((page) => page.url);
}

describe("section collection index resolution", () => {
  test("resolves a collection id to the canonical definition", () => {
    expect(resolveDocsCollectionInput("models")).toEqual(
      getDocsCollectionDefinition("models"),
    );
  });

  test("accepts a full collection definition without re-resolving", () => {
    expect(resolveDocsCollectionInput(trainingDefinition)).toBe(
      trainingDefinition,
    );
  });

  test("rejects unknown collection ids with not-found behavior", () => {
    expect(isDocsCollectionId("unknown-collection")).toBe(false);

    try {
      resolveDocsCollectionInput("unknown-collection");
      throw new Error("Expected unknown collection id to fail");
    } catch (error) {
      expect(error).toBeInstanceOf(Error);
      expect((error as Error).message).toMatch(
        /notFound\(\)|NEXT_HTTP_ERROR_FALLBACK;404/,
      );
    }
  });

  test("maps section frontmatter kinds to collection ids", () => {
    expect(resolveSectionKindCollectionId("training-regime")).toBe("training");
    expect(resolveSectionKindCollectionId("model")).toBe("models");
  });

  test("resolves localized index copy from collection message metadata", async () => {
    const messages = await loadUiMessages();
    const modelsDefinition = getDocsCollectionDefinition("models");
    const resolved = resolveDocsCollectionIndexMessages(
      messages,
      modelsDefinition,
    );

    expect(resolved).toEqual(messages.modelsIndex);
    expect(
      resolveDocsCollectionIndexMessages(messages, trainingDefinition),
    ).toEqual(messages.trainingIndex);
  });

  test("resolves index copy from an inline collection definition", async () => {
    const messages = await loadUiMessages();
    const inlineDefinition: DocsCollectionDefinition = {
      ...trainingDefinition,
      starterSlugs: ["training/on-policy-distillation"],
    };

    expect(
      resolveDocsCollectionIndexMessages(messages, inlineDefinition),
    ).toEqual(messages.trainingIndex);
  });
});

describe("renderSectionCollectionIndexPage populated collections", () => {
  for (const {
    collectionId,
    representativeHrefs,
  } of SECTION_INDEX_RENDER_CASES) {
    test(`renders ${collectionId} title, description, list label, and representative entries`, async () => {
      const messages = await loadUiMessages();
      const indexMessages = sectionIndexMessages(messages, collectionId);
      const html = renderToStaticMarkup(
        await renderSectionCollectionIndexPage(collectionId),
      );

      expect(html).toContain(indexMessages.title);
      expect(html).toContain(indexMessages.description);
      expect(html).toContain(`aria-label="${indexMessages.listLabel}"`);

      for (const href of representativeHrefs) {
        expect(html).toContain(`href="${href}"`);
      }
    });
  }

  test("sorts modules and systems entries alphabetically by title", async () => {
    const messages = await loadUiMessages();

    for (const collectionId of ["modules", "systems"] as const) {
      const indexMessages = sectionIndexMessages(messages, collectionId);
      const html = renderToStaticMarkup(
        await renderSectionCollectionIndexPage(collectionId),
      );
      const renderedHrefs = extractIndexListEntryHrefs(
        html,
        indexMessages.listLabel,
      );
      const expectedHrefs = await expectedSectionIndexHrefs(collectionId);

      expect(renderedHrefs).toEqual(expectedHrefs);
      expect(renderedHrefs.length).toBeGreaterThan(1);
    }
  });

  test("renders the same models output when passed the collection definition", async () => {
    const byId = renderToStaticMarkup(
      await renderSectionCollectionIndexPage("models"),
    );
    const byDefinition = renderToStaticMarkup(
      await renderSectionCollectionIndexPage(
        getDocsCollectionDefinition("models"),
      ),
    );

    expect(byDefinition).toBe(byId);
  });
});

describe("renderSectionCollectionIndexPage training mapping", () => {
  test("lists training-regime pages for the training collection id", async () => {
    const pages = await loadShippedLocalizedDocsPages(defaultLocale);
    const trainingPages = pages.filter(
      (page) => page.frontmatter.kind === "training-regime",
    );

    expect(trainingPages.length).toBeGreaterThan(0);

    const html = renderToStaticMarkup(
      await renderSectionCollectionIndexPage("training"),
    );

    for (const page of trainingPages) {
      expect(html).toContain(`href="${page.url}"`);
    }
  });
});

describe("renderSectionCollectionIndexPage empty state", () => {
  test("renders DocsIndexEmptyState copy from collection index message metadata", async () => {
    const messages = await loadUiMessages("vi");
    const modelsDefinition = getDocsCollectionDefinition("models");
    const html = renderToStaticMarkup(
      await renderSectionCollectionIndexPage(modelsDefinition, "vi"),
    );

    expect(html).toContain(messages.modelsIndex.emptyTitle);
    expect(html).toContain(messages.modelsIndex.emptyDescription);
    expect(html).toContain(messages.modelsIndex.emptyHomeLink);
    expect(html).toContain('href="/vi"');
    expect(html).not.toContain(
      `aria-label="${messages.modelsIndex.listLabel}"`,
    );
  });
});
