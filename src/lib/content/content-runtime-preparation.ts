import { spawnSync } from "node:child_process";

export type ContentRuntimePreparationStep = {
  id: string;
  command: readonly [string, ...string[]];
  outputPath: string;
  gitClassification: "committed" | "ignored";
  owningSurface: string;
};

export type ContentRuntimePreparationCommandResult = {
  error?: Error;
  signal: NodeJS.Signals | null;
  status: number | null;
};

export type RunContentRuntimePreparationCommand = (
  command: readonly [string, ...string[]],
  options: {
    cwd: string;
  },
) => ContentRuntimePreparationCommandResult;

export type ContentRuntimePreparationLogger = (message: string) => void;

export const CONTENT_RUNTIME_COMPLETENESS_CONTRACT: readonly ContentRuntimePreparationStep[] =
  [
    {
      id: "shipped-localized-docs",
      command: ["bun", "run", "generate:shipped-localized-docs"],
      outputPath:
        "src/lib/content/generated/shipped-localized-docs.generated.ts",
      gitClassification: "committed",
      owningSurface: "shipped localized docs runtime helpers",
    },
    {
      id: "graph-registry-runtime",
      command: ["bun", "run", "generate:graph-registry-runtime"],
      outputPath:
        "src/lib/content/generated/graph-registry-runtime.generated.ts",
      gitClassification: "ignored",
      owningSurface: "graph registry runtime lookups",
    },
    {
      id: "published-docs-registry",
      command: ["bun", "run", "generate:published-docs-registry"],
      outputPath:
        "src/lib/content/generated/published-docs-registry.generated.ts",
      gitClassification: "ignored",
      owningSurface: "published docs registry manifest",
    },
    {
      id: "registry-runtime",
      command: ["bun", "run", "generate:registry-runtime"],
      outputPath: "src/lib/content/generated/registry-runtime.generated.ts",
      gitClassification: "ignored",
      owningSurface: "main content registry runtime",
    },
    {
      id: "table-registry-runtime",
      command: ["bun", "run", "generate:table-registry"],
      outputPath: "src/lib/content/generated/table-registry.generated.ts",
      gitClassification: "committed",
      owningSurface: "table registry runtime payloads",
    },
  ] as const;

export const CONTENT_RUNTIME_PREPARATION_STEPS =
  CONTENT_RUNTIME_COMPLETENESS_CONTRACT;

export type RunContentRuntimePreparationOptions = {
  cwd: string;
  log?: ContentRuntimePreparationLogger;
  logError?: ContentRuntimePreparationLogger;
  runCommand?: RunContentRuntimePreparationCommand;
  steps?: readonly ContentRuntimePreparationStep[];
};

export type ContentRuntimePreparationResult =
  | {
      ok: true;
      completedSteps: readonly ContentRuntimePreparationStep[];
    }
  | {
      ok: false;
      completedSteps: readonly ContentRuntimePreparationStep[];
      failedStep: ContentRuntimePreparationStep;
      commandResult: ContentRuntimePreparationCommandResult;
    };

function runCommandSync(
  command: readonly [string, ...string[]],
  options: {
    cwd: string;
  },
): ContentRuntimePreparationCommandResult {
  const [binary, ...args] = command;
  const result = spawnSync(binary, args, {
    cwd: options.cwd,
    env: process.env,
    stdio: "inherit",
  });

  return {
    error:
      result.error instanceof Error
        ? result.error
        : result.error
          ? new Error(String(result.error))
          : undefined,
    signal: result.signal,
    status: result.status,
  };
}

function formatCommand(command: readonly [string, ...string[]]): string {
  return command.join(" ");
}

export function runContentRuntimePreparation(
  options: RunContentRuntimePreparationOptions,
): ContentRuntimePreparationResult {
  const runCommand = options.runCommand ?? runCommandSync;
  const log = options.log ?? console.log;
  const logError = options.logError ?? console.error;
  const steps = options.steps ?? CONTENT_RUNTIME_PREPARATION_STEPS;
  const completedSteps: ContentRuntimePreparationStep[] = [];

  for (const step of steps) {
    log(
      `[content-runtime] Preparing ${step.id} -> ${step.outputPath} (${formatCommand(step.command)})`,
    );
    const commandResult = runCommand(step.command, {
      cwd: options.cwd,
    });

    if (commandResult.status !== 0) {
      const failureReason =
        commandResult.status === null
          ? commandResult.signal
            ? `signal ${commandResult.signal}`
            : (commandResult.error?.message ?? "unknown failure")
          : `exit status ${commandResult.status}`;
      logError(
        `[content-runtime] Failed step "${step.id}" while running ${formatCommand(step.command)} (${failureReason}).`,
      );

      return {
        ok: false,
        completedSteps,
        failedStep: step,
        commandResult,
      };
    }

    completedSteps.push(step);
  }

  log(
    `[content-runtime] Prepared ${completedSteps.length} runtime steps successfully.`,
  );

  return {
    ok: true,
    completedSteps,
  };
}
