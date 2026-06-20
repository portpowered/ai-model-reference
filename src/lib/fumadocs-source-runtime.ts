type GeneratedDocsSourceBinding = typeof import("../../.source/server");

type ImportLike = (specifier: string) => Promise<unknown>;

const GENERATED_SOURCE_SERVER_SPECIFIER = "../../.source/server";
const GENERATED_SOURCE_RECOVERY_GUIDANCE =
  "Missing generated Fumadocs source runtime at ../../.source/server. Run a supported command that prepares the content runtime and Fumadocs bindings, such as `make typecheck`, `make test`, or `bun run prepare:content-runtime && bunx fumadocs-mdx` when reproducing the issue directly.";

function isMissingGeneratedSourceModule(error: unknown): boolean {
  if (!(error instanceof Error)) {
    return false;
  }

  const moduleError = error as Error & { code?: string };
  return (
    (moduleError.code === "MODULE_NOT_FOUND" ||
      moduleError.code === "ERR_MODULE_NOT_FOUND") &&
    error.message.includes(".source/server")
  );
}

export async function loadGeneratedDocsSourceBinding(
  importModule: ImportLike = (specifier) => import(specifier),
): Promise<GeneratedDocsSourceBinding> {
  try {
    return (await importModule(
      GENERATED_SOURCE_SERVER_SPECIFIER,
    )) as GeneratedDocsSourceBinding;
  } catch (error) {
    if (isMissingGeneratedSourceModule(error)) {
      throw new Error(GENERATED_SOURCE_RECOVERY_GUIDANCE, {
        cause: error,
      });
    }

    throw error;
  }
}
