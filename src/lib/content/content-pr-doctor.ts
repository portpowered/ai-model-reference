import { spawnSync } from "node:child_process";
import { CONTENT_RUNTIME_PREPARATION_STEPS } from "@/lib/content/content-runtime-preparation";

export type ContentPrDoctorCommandResult = {
  error?: Error;
  signal: NodeJS.Signals | null;
  status: number | null;
  stderr?: string;
  stdout?: string;
};

export type RunContentPrDoctorCommand = (
  command: readonly [string, ...string[]],
  options: {
    cwd: string;
    captureOutput?: boolean;
  },
) => ContentPrDoctorCommandResult;

export type ContentPrDoctorLogger = (message: string) => void;

export type ContentPrDoctorValidationStep = {
  id: string;
  command: readonly [string, ...string[]];
  guidance: string;
};

export const CONTENT_PR_DOCTOR_SOURCE_PATHS = ["src/content"] as const;

export const CONTENT_PR_DOCTOR_PREPARATION_COMMAND = [
  "bun",
  "run",
  "prepare:content-runtime",
] as const;

export const CONTENT_PR_DOCTOR_DERIVED_ARTIFACT_PATHS =
  CONTENT_RUNTIME_PREPARATION_STEPS.map((step) => step.outputPath);

export const CONTENT_PR_DOCTOR_SCOPED_PATHS = [
  ...CONTENT_PR_DOCTOR_SOURCE_PATHS,
  ...CONTENT_PR_DOCTOR_DERIVED_ARTIFACT_PATHS,
] as const;

export const CONTENT_PR_DOCTOR_VALIDATION_STEPS: readonly ContentPrDoctorValidationStep[] =
  [
    {
      id: "validate-data",
      command: ["bun", "run", "validate-data"],
      guidance:
        "Fix the registry or content validation errors, then rerun `bun run doctor:content-pr`.",
    },
    {
      id: "linkcheck",
      command: ["bun", "run", "linkcheck"],
      guidance:
        "Fix the reported docs links or anchors, then rerun `bun run doctor:content-pr`.",
    },
  ] as const;

export type ContentPrDoctorStageId =
  | "preflight-cleanliness"
  | "prepare-content-runtime"
  | "narrow-validation"
  | "final-cleanliness";

export type RunContentPrDoctorOptions = {
  cwd: string;
  log?: ContentPrDoctorLogger;
  logError?: ContentPrDoctorLogger;
  runCommand?: RunContentPrDoctorCommand;
  validationSteps?: readonly ContentPrDoctorValidationStep[];
  scopedPaths?: readonly string[];
};

export type ContentPrDoctorResult =
  | {
      ok: true;
      scopedPaths: readonly string[];
      validationSteps: readonly ContentPrDoctorValidationStep[];
    }
  | {
      ok: false;
      stage: ContentPrDoctorStageId;
      message: string;
      repairGuidance: string;
      scopedPaths: readonly string[];
      details?: readonly string[];
      failedValidationStep?: ContentPrDoctorValidationStep;
      commandResult?: ContentPrDoctorCommandResult;
    };

function runCommandSync(
  command: readonly [string, ...string[]],
  options: {
    cwd: string;
    captureOutput?: boolean;
  },
): ContentPrDoctorCommandResult {
  const [binary, ...args] = command;
  const result = spawnSync(binary, args, {
    cwd: options.cwd,
    env: process.env,
    encoding: "utf8",
    stdio: options.captureOutput ? "pipe" : "inherit",
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
    stderr: typeof result.stderr === "string" ? result.stderr : undefined,
    stdout: typeof result.stdout === "string" ? result.stdout : undefined,
  };
}

function formatCommand(command: readonly [string, ...string[]]): string {
  return command.join(" ");
}

function formatFailureReason(
  commandResult: Pick<
    ContentPrDoctorCommandResult,
    "error" | "signal" | "status"
  >,
): string {
  if (commandResult.status !== null) {
    return `exit status ${commandResult.status}`;
  }

  if (commandResult.signal) {
    return `signal ${commandResult.signal}`;
  }

  return commandResult.error?.message ?? "unknown failure";
}

function parseTrackedChanges(stdout: string | undefined): string[] {
  return (stdout ?? "")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.length > 0);
}

function listTrackedScopedChanges(
  cwd: string,
  scopedPaths: readonly string[],
  runCommand: RunContentPrDoctorCommand,
): {
  changes: string[];
  commandResult: ContentPrDoctorCommandResult;
} {
  const command: [string, ...string[]] = [
    "git",
    "status",
    "--porcelain",
    "--untracked-files=no",
    "--",
    ...scopedPaths,
  ];
  const commandResult = runCommand(command, {
    cwd,
    captureOutput: true,
  });

  return {
    changes: parseTrackedChanges(commandResult.stdout),
    commandResult,
  };
}

function logStage(
  log: ContentPrDoctorLogger,
  stageNumber: number,
  stageId: ContentPrDoctorStageId,
  description: string,
): void {
  log(
    `[content-pr-doctor] Stage ${stageNumber}/4: ${stageId} - ${description}`,
  );
}

export function runContentPrDoctor(
  options: RunContentPrDoctorOptions,
): ContentPrDoctorResult {
  const log = options.log ?? console.log;
  const runCommand = options.runCommand ?? runCommandSync;
  const validationSteps =
    options.validationSteps ?? CONTENT_PR_DOCTOR_VALIDATION_STEPS;
  const scopedPaths = options.scopedPaths ?? CONTENT_PR_DOCTOR_SCOPED_PATHS;

  log(
    "[content-pr-doctor] Supported review-readiness proof for content branches only. This flow reuses `bun run prepare:content-runtime` and does not replace `make ci`.",
  );
  log(`[content-pr-doctor] Scoped tracked paths: ${scopedPaths.join(", ")}`);

  logStage(
    log,
    1,
    "preflight-cleanliness",
    "verify the tracked content and derived-artifact paths are clean before regeneration starts",
  );
  const preflight = listTrackedScopedChanges(
    options.cwd,
    scopedPaths,
    runCommand,
  );
  if (preflight.commandResult.status !== 0) {
    return {
      ok: false,
      stage: "preflight-cleanliness",
      message:
        "Unable to inspect tracked content PR paths before running the doctor flow.",
      repairGuidance:
        "Fix the git status failure in this worktree, then rerun `bun run doctor:content-pr`.",
      scopedPaths,
      commandResult: preflight.commandResult,
    };
  }
  if (preflight.changes.length > 0) {
    return {
      ok: false,
      stage: "preflight-cleanliness",
      message:
        "Branch is not review-ready because tracked content PR paths are already dirty at doctor start.",
      repairGuidance:
        "Review, commit, stash, or discard the listed tracked changes in the scoped paths before rerunning `bun run doctor:content-pr`.",
      scopedPaths,
      details: preflight.changes,
      commandResult: preflight.commandResult,
    };
  }

  logStage(
    log,
    2,
    "prepare-content-runtime",
    "run the supported content-runtime preparation entrypoint, then prove the tracked authoritative outputs stayed clean",
  );
  log(
    `[content-pr-doctor] Running canonical preparation entrypoint (${formatCommand(CONTENT_PR_DOCTOR_PREPARATION_COMMAND)})`,
  );
  const preparation = runCommand(CONTENT_PR_DOCTOR_PREPARATION_COMMAND, {
    cwd: options.cwd,
  });
  if (preparation.status !== 0) {
    return {
      ok: false,
      stage: "prepare-content-runtime",
      message: `Content runtime preparation failed while running "${formatCommand(CONTENT_PR_DOCTOR_PREPARATION_COMMAND)}" (${formatFailureReason(preparation)}).`,
      repairGuidance:
        "Fix the failing content-runtime preparation step, then rerun `bun run doctor:content-pr` so the authoritative derived artifacts are refreshed through the supported command path.",
      scopedPaths,
      commandResult: preparation,
    };
  }
  const postPreparationCheck = listTrackedScopedChanges(
    options.cwd,
    scopedPaths,
    runCommand,
  );
  if (postPreparationCheck.commandResult.status !== 0) {
    return {
      ok: false,
      stage: "prepare-content-runtime",
      message:
        "Unable to verify authoritative derived-artifact state after content-runtime preparation.",
      repairGuidance:
        "Fix the git status failure in this worktree, then rerun `bun run doctor:content-pr`.",
      scopedPaths,
      commandResult: postPreparationCheck.commandResult,
    };
  }
  if (postPreparationCheck.changes.length > 0) {
    return {
      ok: false,
      stage: "prepare-content-runtime",
      message:
        "Content runtime preparation regenerated tracked scoped paths, so the branch is not review-ready until the authoritative derived artifacts are reviewed and committed.",
      repairGuidance:
        "Regenerate through `bun run prepare:content-runtime`, review the listed derived-artifact changes, commit the authoritative updates, and rerun `bun run doctor:content-pr` before requesting review.",
      scopedPaths,
      details: postPreparationCheck.changes,
      commandResult: postPreparationCheck.commandResult,
    };
  }

  logStage(
    log,
    3,
    "narrow-validation",
    "run the narrow content PR validation checks expected for review readiness",
  );
  for (const step of validationSteps) {
    log(
      `[content-pr-doctor] Running ${step.id} (${formatCommand(step.command)})`,
    );
    const result = runCommand(step.command, {
      cwd: options.cwd,
    });
    if (result.status !== 0) {
      return {
        ok: false,
        stage: "narrow-validation",
        message: `Narrow content PR validation failed at "${step.id}" (${formatFailureReason(result)}).`,
        repairGuidance: step.guidance,
        scopedPaths,
        failedValidationStep: step,
        commandResult: result,
      };
    }
  }

  logStage(
    log,
    4,
    "final-cleanliness",
    "prove the tracked content and derived-artifact paths are still clean after preparation and validation",
  );
  const finalCheck = listTrackedScopedChanges(
    options.cwd,
    scopedPaths,
    runCommand,
  );
  if (finalCheck.commandResult.status !== 0) {
    return {
      ok: false,
      stage: "final-cleanliness",
      message:
        "Unable to verify the final tracked content PR path state after validation.",
      repairGuidance:
        "Fix the git status failure in this worktree, then rerun `bun run doctor:content-pr`.",
      scopedPaths,
      commandResult: finalCheck.commandResult,
    };
  }
  if (finalCheck.changes.length > 0) {
    return {
      ok: false,
      stage: "final-cleanliness",
      message:
        "Branch is not review-ready because the supported content PR proof left tracked scoped paths dirty.",
      repairGuidance:
        "Review and commit the regenerated artifacts in the scoped paths, or fix the underlying drift and rerun `bun run doctor:content-pr` until the final clean-tree proof passes.",
      scopedPaths,
      details: finalCheck.changes,
      commandResult: finalCheck.commandResult,
    };
  }

  log(
    "[content-pr-doctor] Review-ready proof complete for .: canonical preparation + validate-data + linkcheck + clean-tree proof.",
  );

  return {
    ok: true,
    scopedPaths,
    validationSteps,
  };
}
