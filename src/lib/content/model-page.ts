import type { LoadedModelPage } from "./model-page-load";

export type { LoadedModelPage } from "./model-page-load";

/** Loads a model MDX page via a dynamic import boundary. */
export async function loadModelPage(
  slug: string,
  locale = "en",
): Promise<LoadedModelPage> {
  const { loadModelPageFromDisk } = await import("./model-page-load");
  return loadModelPageFromDisk(slug, locale);
}
