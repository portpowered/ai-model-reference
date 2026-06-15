import {
  formatGeneratePageBundlePlan,
  GeneratePageBundleError,
  generatePageBundle,
} from "./generate-page-bundle";
import {
  type PageSpec,
  PageSpecValidationError,
  parsePageSpecFile,
} from "./page-spec";

export type GeneratePageBundleCliInput = {
  specPath: string;
  dryRun?: boolean;
  projectRoot?: string;
};

export type GeneratePageBundleCliErrorCategory =
  | "invalid-input"
  | "unresolved-reference"
  | "missing-template"
  | "existing-target"
  | "usage";

export class GeneratePageBundleCliError extends Error {
  readonly category: GeneratePageBundleCliErrorCategory;

  constructor(category: GeneratePageBundleCliErrorCategory, message: string) {
    super(message);
    this.name = "GeneratePageBundleCliError";
    this.category = category;
  }
}

function isNodeErrnoException(error: unknown): error is NodeJS.ErrnoException {
  return (
    error !== null &&
    typeof error === "object" &&
    "code" in error &&
    typeof (error as NodeJS.ErrnoException).code === "string"
  );
}

export function parseGeneratePageBundleArgv(
  argv: string[],
): GeneratePageBundleCliInput {
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
        throw new GeneratePageBundleCliError(
          "usage",
          `Missing value for --${key}`,
        );
      }
      options[key] = next;
      index += 1;
      continue;
    }
    positional.push(arg);
  }

  if (positional.length > 0) {
    throw new GeneratePageBundleCliError(
      "usage",
      `Unexpected positional arguments: ${positional.join(" ")}`,
    );
  }

  const specPath = options.spec;
  if (typeof specPath !== "string" || specPath.length === 0) {
    throw new GeneratePageBundleCliError(
      "usage",
      "Required flag --spec <page-spec.json> is missing",
    );
  }

  return {
    specPath,
    dryRun: options.dryRun === true,
  };
}

export function formatGeneratePageBundleUsage(): string {
  return [
    "Usage: bun ./scripts/generate-page-bundle.ts --spec <page-spec.json> [options]",
    "",
    "Required:",
    "  --spec <path>  JSON page spec for concept, glossary, module, model, paper, or training-regime pages",
    "",
    "Optional:",
    "  --dry-run  Print planned registry id, route, and file paths without writing files",
    "",
    "For concept and glossary pages, prefer this command over scaffold-doc-page so title,",
    "summary, sections, and assets stay aligned in one page-spec input.",
    "",
    "Example page spec:",
    '  { "kind": "concept", "slug": "example", "title": "Example", "summary": "Short summary.", "conceptType": "general" }',
  ].join("\n");
}

function formatInvalidInputMessage(error: PageSpecValidationError): string {
  const lines = [
    "Invalid page spec input:",
    ...error.issues.map((issue) => `  - ${issue.field}: ${issue.message}`),
  ];
  return lines.join("\n");
}

export function classifyGeneratePageBundleFailure(error: unknown): {
  category: GeneratePageBundleCliErrorCategory;
  message: string;
} {
  if (error instanceof GeneratePageBundleCliError) {
    return { category: error.category, message: error.message };
  }

  if (error instanceof PageSpecValidationError) {
    return {
      category: "invalid-input",
      message: formatInvalidInputMessage(error),
    };
  }

  if (error instanceof GeneratePageBundleError) {
    if (error.message.startsWith("Refusing to overwrite existing path:")) {
      return {
        category: "existing-target",
        message: `Existing target file: ${error.message}`,
      };
    }
    if (error.message.startsWith("Unresolved reference:")) {
      return {
        category: "unresolved-reference",
        message: error.message,
      };
    }
    return {
      category: "invalid-input",
      message: error.message,
    };
  }

  if (isNodeErrnoException(error) && error.code === "ENOENT") {
    const path = error.path ?? "unknown path";
    return {
      category: "missing-template",
      message: `Missing template or page spec file: ${path}`,
    };
  }

  if (error instanceof Error) {
    return {
      category: "invalid-input",
      message: error.message,
    };
  }

  return {
    category: "invalid-input",
    message: String(error),
  };
}

export type GeneratePageBundleCliResult = {
  plan: string;
  dryRun: boolean;
};

export async function runGeneratePageBundleCli(
  input: GeneratePageBundleCliInput,
): Promise<GeneratePageBundleCliResult> {
  let spec: PageSpec;
  try {
    spec = await parsePageSpecFile(input.specPath);
  } catch (error) {
    const failure = classifyGeneratePageBundleFailure(error);
    throw new GeneratePageBundleCliError(failure.category, failure.message);
  }

  try {
    const result = await generatePageBundle({
      spec,
      dryRun: input.dryRun,
      projectRoot: input.projectRoot,
    });

    return {
      plan: formatGeneratePageBundlePlan(result),
      dryRun: input.dryRun === true,
    };
  } catch (error) {
    const failure = classifyGeneratePageBundleFailure(error);
    throw new GeneratePageBundleCliError(failure.category, failure.message);
  }
}
