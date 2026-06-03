import type { LoadedModulePage } from "./module-page-load";

export type { LoadedModulePage } from "./module-page-load";

/** Loads a published module MDX page via a dynamic import boundary. */
export async function loadModulePage(
  slug: string,
  locale = "en",
): Promise<LoadedModulePage> {
  const { loadModulePageFromDisk } = await import("./module-page-load");
  return loadModulePageFromDisk(slug, locale);
}
