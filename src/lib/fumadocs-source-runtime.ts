type GeneratedDocsSourceBinding = typeof import("../../.source/server");

type LoadGeneratedDocsSourceModule = () => Promise<unknown>;

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
  loadModule: LoadGeneratedDocsSourceModule = () =>
    import("../../.source/server"),
): Promise<GeneratedDocsSourceBinding> {
  try {
    return (await loadModule()) as GeneratedDocsSourceBinding;
  } catch (error) {
    if (isMissingGeneratedSourceModule(error)) {
      throw new Error(GENERATED_SOURCE_RECOVERY_GUIDANCE, {
        cause: error,
      });
    }

    throw error;
  }
}
