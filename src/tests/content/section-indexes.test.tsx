import { describe, expect, it } from "bun:test";
import { renderToStaticMarkup } from "react-dom/server";
import ConceptsIndexPage from "@/app/(site)/docs/concepts/page";
import ModelsIndexPage, {
  generateMetadata as generateModelsMetadata,
} from "@/app/(site)/docs/models/page";
import ModulesIndexPage from "@/app/(site)/docs/modules/page";
import PapersIndexPage from "@/app/(site)/docs/papers/page";
import SystemsIndexPage from "@/app/(site)/docs/systems/page";
import TrainingIndexPage from "@/app/(site)/docs/training/page";
import LocalizedModelsIndexPage, {
  generateMetadata as generateLocalizedModelsMetadata,
} from "@/app/[locale]/docs/models/page";
import LocalizedModulesIndexPage from "@/app/[locale]/docs/modules/page";
import { loadUiMessages } from "@/lib/content/ui-messages";

describe("section index messages", () => {
  it("loads localized copy for model, module, concept, paper, training, and system index pages", async () => {
    const messages = await loadUiMessages();
    expect(messages.modelsIndex.title).toBe("Models");
    expect(messages.modulesIndex.title).toBe("Modules");
    expect(messages.conceptsIndex.title).toBe("Concepts");
    expect(messages.papersIndex.title).toBe("Papers");
    expect(messages.trainingIndex.title).toBe("Training");
    expect(messages.systemsIndex.title).toBe("Systems");
  });
});

describe("section index page render", () => {
  it("renders the models index so model breadcrumbs land on a real page", async () => {
    const html = renderToStaticMarkup(await ModelsIndexPage());

    expect(html).toContain("Models");
    expect(html).toContain('href="/docs/models/gpt-3"');
    expect(html).toContain("list-none");
    expect(html).not.toContain("list-disc");
  });

  it("renders the modules index with published module entries", async () => {
    const html = renderToStaticMarkup(await ModulesIndexPage());

    expect(html).toContain("Modules");
    expect(html).toContain('href="/docs/modules/grouped-query-attention"');
    expect(html).toContain('href="/docs/modules/swiglu"');
  });

  it("renders the concepts index with published concept entries", async () => {
    const html = renderToStaticMarkup(await ConceptsIndexPage());

    expect(html).toContain("Concepts");
    expect(html).toContain('href="/docs/concepts/transformer-architecture"');
    expect(html).toContain('href="/docs/concepts/quantization"');
  });

  it("renders the papers index with published paper entries", async () => {
    const html = renderToStaticMarkup(await PapersIndexPage());

    expect(html).toContain("Papers");
    expect(html).toContain('href="/docs/papers/deepseek-v4"');
  });

  it("renders the training index with published training entries", async () => {
    const html = renderToStaticMarkup(await TrainingIndexPage());

    expect(html).toContain("Training");
    expect(html).toContain('href="/docs/training/on-policy-distillation"');
    expect(html).toContain('href="/docs/training/specialist-training"');
  });

  it("renders the systems index with published system entries", async () => {
    const html = renderToStaticMarkup(await SystemsIndexPage());

    expect(html).toContain("Systems");
    expect(html).toContain('href="/docs/systems/deployment"');
    expect(html).toContain('href="/docs/systems/routing"');
    expect(html).toContain('href="/docs/systems/batching"');
    expect(html).toContain('href="/docs/systems/on-disk-kv-cache"');
    expect(html).toContain('href="/docs/systems/expert-parallel-overlap"');
  });
});

describe("localized section index page render", () => {
  it("renders the vietnamese models index with localized title and empty-state copy", async () => {
    const html = renderToStaticMarkup(
      await LocalizedModelsIndexPage({
        params: Promise.resolve({ locale: "vi" }),
      }),
    );

    expect(html).toContain("Mô hình");
    expect(html).toContain("Chưa có mục mô hình nào");
    expect(html).toContain('href="/vi"');
  });

  it("renders the japanese modules index with localized title and entries", async () => {
    const html = renderToStaticMarkup(
      await LocalizedModulesIndexPage({
        params: Promise.resolve({ locale: "ja" }),
      }),
    );

    expect(html).toContain("モジュール");
    expect(html).toContain('href="/ja/docs/modules/grouped-query-attention"');
  });
});

describe("section index metadata", () => {
  it("keeps default and localized models index metadata aligned", async () => {
    const defaultMetadata = await generateModelsMetadata();
    const localizedMetadata = await generateLocalizedModelsMetadata({
      params: Promise.resolve({ locale: "vi" }),
    });

    expect(defaultMetadata.alternates).toEqual({
      canonical: "/docs/models",
      languages: {
        en: "/docs/models",
        vi: "/vi/docs/models",
        ja: "/ja/docs/models",
      },
    });
    expect(localizedMetadata.alternates).toEqual(defaultMetadata.alternates);

    const viMessages = await loadUiMessages("vi");
    expect(localizedMetadata.title).toBe(viMessages.modelsIndex.title);
    expect(localizedMetadata.description).toBe(
      viMessages.modelsIndex.description,
    );
  });
});
