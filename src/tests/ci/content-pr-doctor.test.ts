import { describe, expect, test } from "bun:test";
import {
  CONTENT_PR_DOCTOR_PREPARATION_COMMAND,
  CONTENT_PR_DOCTOR_SCOPED_PATHS,
  CONTENT_PR_DOCTOR_VALIDATION_STEPS,
  type ContentPrDoctorCommandResult,
  runContentPrDoctor,
} from "@/lib/content/content-pr-doctor";
import {
  CONTENT_RUNTIME_PREPARATION_STEPS,
  type VerifyContentRuntimeCompletenessResult,
} from "@/lib/content/content-runtime-preparation";

const repoRoot = import.meta.dir;

function createGitInspectionResult(
  command: readonly string[],
): ContentPrDoctorCommandResult {
  const targetPath = command[command.length - 1];

  if (command[1] === "status") {
    return {
      signal: null,
      status: 0,
      stdout: "",
    } satisfies ContentPrDoctorCommandResult;
  }

  const step = CONTENT_RUNTIME_PREPARATION_STEPS.find(
    (candidate) => candidate.outputPath === targetPath,
  );
  if (!step) {
    return {
      signal: null,
      status: 1,
      stdout: "",
      stderr: "",
    } satisfies ContentPrDoctorCommandResult;
  }

  if (command[1] === "ls-files") {
    return {
      signal: null,
      status: step.gitClassification === "committed" ? 0 : 1,
      stdout: step.gitClassification === "committed" ? targetPath : "",
      stderr: "",
    } satisfies ContentPrDoctorCommandResult;
  }

  if (command[1] === "check-ignore") {
    return {
      signal: null,
      status: step.gitClassification === "ignored" ? 0 : 1,
      stdout: "",
      stderr: "",
    } satisfies ContentPrDoctorCommandResult;
  }

  return {
    signal: null,
    status: 1,
    stdout: "",
    stderr: "",
  } satisfies ContentPrDoctorCommandResult;
}

function createSuccessfulRuntimeCompletenessResult(): VerifyContentRuntimeCompletenessResult {
  return {
    ok: true,
    verifiedSteps: CONTENT_RUNTIME_PREPARATION_STEPS,
  };
}

describe("content PR doctor", () => {
  test("describes the supported stage order and scoped command contract", () => {
    const logs: string[] = [];
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log(message) {
        logs.push(message);
      },
      logError(message) {
        logs.push(message);
      },
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));
        if (command[0] === "git") {
          return command[1] === "status"
            ? createGitInspectionResult(command)
            : {
                signal: null,
                status: 0,
                stdout: "",
                stderr: "",
              };
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(true);
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Supported review-readiness proof for content branches only",
        ),
        expect.stringContaining(
          "Stage 1/4: preflight-cleanliness - verify the tracked content and derived-artifact paths are clean before regeneration starts",
        ),
        expect.stringContaining(
          "Stage 2/4: prepare-content-runtime - run the supported content-runtime preparation entrypoint, then prove the tracked authoritative outputs stayed clean",
        ),
        expect.stringContaining(
          "Stage 3/4: narrow-validation - run the narrow content PR validation checks expected for review readiness",
        ),
        expect.stringContaining(
          "Stage 4/4: final-cleanliness - prove the tracked content and derived-artifact paths are still clean after preparation and validation",
        ),
      ]),
    );
    expect(commands[0]).toBe(
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    );
    expect(commands[1]).toBe(CONTENT_PR_DOCTOR_PREPARATION_COMMAND.join(" "));
    expect(commands[2]).toBe(
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    );
    expect(commands).toEqual(
      expect.arrayContaining([
        ...CONTENT_PR_DOCTOR_VALIDATION_STEPS.map((step) =>
          step.command.join(" "),
        ),
        `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
          " ",
        )}`,
      ]),
    );
  });

  test("passes clean preflight and proceeds to canonical preparation", () => {
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
          return command[1] === "status"
            ? createGitInspectionResult(command)
            : {
                signal: null,
                status: 0,
                stdout: "",
                stderr: "",
              };
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(true);
    expect(commands[0]).toBe(
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    );
    expect(commands[1]).toBe(CONTENT_PR_DOCTOR_PREPARATION_COMMAND.join(" "));
  });

  test("fails early when tracked scoped paths are already dirty", () => {
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        if (command[0] === "git") {
          return {
            signal: null,
            status: 0,
            stdout:
              " M src/content/docs/modules/grouped-query-attention/page.mdx\n",
          } satisfies ContentPrDoctorCommandResult;
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("preflight-cleanliness");
    expect(result.message).toContain("already dirty at doctor start");
    expect(result.details).toEqual([
      " M src/content/docs/modules/grouped-query-attention/page.mdx",
    ]);
    expect(result.repairGuidance).toContain(
      "Review, commit, stash, or discard",
    );
    expect(result.repairGuidance).toContain("bun run doctor:content-pr");
  });

  test("does not start preparation when preflight finds scoped tracked changes", () => {
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));

        return {
          ...createGitInspectionResult(command),
          stdout:
            command[0] === "git" && command[1] === "status"
              ? " M src/lib/content/generated/registry-runtime.generated.ts\n"
              : createGitInspectionResult(command).stdout,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    expect(commands).toEqual([
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    ]);
  });

  test("fails at the preparation stage when canonical generation command exits non-zero", () => {
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
          return command[1] === "status"
            ? createGitInspectionResult(command)
            : {
                signal: null,
                status: 0,
                stdout: "",
                stderr: "",
              };
        }

        if (
          command.join(" ") === CONTENT_PR_DOCTOR_PREPARATION_COMMAND.join(" ")
        ) {
          return {
            signal: null,
            status: 1,
          } satisfies ContentPrDoctorCommandResult;
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("prepare-content-runtime");
    expect(result.message).toContain("bun run prepare:content-runtime");
    expect(result.repairGuidance).toContain("bun run doctor:content-pr");
    expect(commands).toEqual([
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      CONTENT_PR_DOCTOR_PREPARATION_COMMAND.join(" "),
    ]);
  });

  test("fails at the preparation stage when canonical generation leaves scoped drift", () => {
    const commands: string[] = [];
    let gitStatusCallCount = 0;
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
          if (command[1] === "status") {
            gitStatusCallCount += 1;
            return {
              signal: null,
              status: 0,
              stdout:
                gitStatusCallCount === 2
                  ? " M src/lib/content/generated/registry-runtime.generated.ts\n"
                  : "",
            } satisfies ContentPrDoctorCommandResult;
          }

          return createGitInspectionResult(command);
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("prepare-content-runtime");
    expect(result.message).toContain(
      "regenerated tracked scoped paths",
    );
    expect(result.details).toEqual([
      " M src/lib/content/generated/registry-runtime.generated.ts",
    ]);
    expect(result.repairGuidance).toContain("bun run prepare:content-runtime");
    expect(commands).toEqual([
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      CONTENT_PR_DOCTOR_PREPARATION_COMMAND.join(" "),
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    ]);
  });

  test("reports a targeted generated-source freshness invariant failure before narrow validation when an ignored deleted-route output is still stale", () => {
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return {
          ok: false,
          kind: "git-classification-mismatch",
          step: CONTENT_RUNTIME_PREPARATION_STEPS[2],
          message:
            'Generated runtime module "src/lib/content/generated/published-docs-registry.generated.ts" for step "published-docs-registry" (published docs registry manifest) has git classification "unclassified", but the completeness contract requires "ignored". Expected this file to be ignored by git and kept as local derived state; instead it is present but neither tracked nor ignored.',
          repairGuidance:
            "Rerun `bun run generate:published-docs-registry` or `bun run prepare:content-runtime`, verify `src/lib/content/generated/published-docs-registry.generated.ts` exists locally, and leave it out of the commit because this runtime module is intentionally ignored derived state.",
        } satisfies VerifyContentRuntimeCompletenessResult;
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));
        return command[1] === "status"
          ? createGitInspectionResult(command)
          : {
              signal: null,
              status: 0,
              stdout: "",
              stderr: "",
            };
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("prepare-content-runtime");
    expect(result.failedRuntimeStep?.id).toBe("published-docs-registry");
    expect(result.message).toContain(
      "Generated-source freshness invariant failed after the supported preparation flow.",
    );
    expect(result.message).toContain(
      'Generated runtime module "src/lib/content/generated/published-docs-registry.generated.ts"',
    );
    expect(result.message).toContain('requires "ignored"');
    expect(result.repairGuidance).toContain(
      "bun run generate:published-docs-registry",
    );
    expect(result.details).toEqual([
      "generated-runtime-step=published-docs-registry",
      "generated-runtime-output=src/lib/content/generated/published-docs-registry.generated.ts",
      "generated-runtime-kind=ignored",
      "generated-runtime-check=git-classification-mismatch",
    ]);
    expect(commands).not.toContain("bun run validate-data");
    expect(commands).not.toContain("bun run linkcheck");
  });

  test("identifies validate-data as the failed narrow validation step and reports repair guidance", () => {
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
          return command[1] === "status"
            ? createGitInspectionResult(command)
            : {
                signal: null,
                status: 0,
                stdout: "",
                stderr: "",
              };
        }

        if (command.join(" ") === "bun run validate-data") {
          return {
            signal: null,
            status: 1,
          } satisfies ContentPrDoctorCommandResult;
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("narrow-validation");
    expect(result.message).toContain('failed at "validate-data"');
    expect(result.failedValidationStep).toEqual(
      CONTENT_PR_DOCTOR_VALIDATION_STEPS[0],
    );
    expect(result.repairGuidance).toContain(
      "Fix the registry or content validation errors",
    );
    expect(result.repairGuidance).toContain("bun run doctor:content-pr");
    expect(commands).toContain("bun run validate-data");
    expect(commands).not.toContain("bun run linkcheck");
  });

  test("identifies linkcheck as the failed narrow validation step and reports repair guidance", () => {
    const commands: string[] = [];
    const logs: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log(message) {
        logs.push(message);
      },
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
          return command[1] === "status"
            ? createGitInspectionResult(command)
            : {
                signal: null,
                status: 0,
                stdout: "",
                stderr: "",
              };
        }

        if (command.join(" ") === "bun run linkcheck") {
          return {
            signal: null,
            status: 1,
          } satisfies ContentPrDoctorCommandResult;
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("narrow-validation");
    expect(result.message).toContain('failed at "linkcheck"');
    expect(result.failedValidationStep).toEqual(
      CONTENT_PR_DOCTOR_VALIDATION_STEPS[1],
    );
    expect(result.repairGuidance).toContain("Fix the reported docs links");
    expect(result.repairGuidance).toContain("bun run doctor:content-pr");
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Running validate-data"),
        expect.stringContaining("Running linkcheck"),
      ]),
    );
    expect(commands).toEqual(
      expect.arrayContaining(["bun run validate-data", "bun run linkcheck"]),
    );
  });

  test("scopes tracked drift checks to the checked-in generated outputs, not the ignored published docs manifest", () => {
    expect(CONTENT_PR_DOCTOR_SCOPED_PATHS).not.toContain(
      "src/lib/content/generated/published-docs-registry.generated.ts",
    );
    expect(CONTENT_PR_DOCTOR_SCOPED_PATHS).not.toContain(
      "src/lib/content/generated/graph-registry-runtime.generated.ts",
    );
    expect(CONTENT_PR_DOCTOR_SCOPED_PATHS).not.toContain(
      "src/lib/content/generated/registry-runtime.generated.ts",
    );
    expect(CONTENT_PR_DOCTOR_SCOPED_PATHS).toEqual(
      expect.arrayContaining([
        "src/content",
        "src/lib/content/generated/shipped-localized-docs.generated.ts",
        "src/lib/content/generated/table-registry.generated.ts",
      ]),
    );
  });

  test("fails the final clean-tree proof when validation leaves tracked scoped drift", () => {
    let gitStatusCallCount = 0;
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        if (command[0] === "git") {
          if (command[1] === "status") {
            gitStatusCallCount += 1;
            return {
              signal: null,
              status: 0,
              stdout:
                gitStatusCallCount === 3
                  ? " M src/content/docs/modules/grouped-query-attention/page.mdx\n"
                  : "",
            } satisfies ContentPrDoctorCommandResult;
          }

          return createGitInspectionResult(command);
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result.ok).toBe(false);
    if (result.ok) {
      return;
    }

    expect(result.stage).toBe("final-cleanliness");
    expect(result.message).toContain(
      "supported content PR proof left tracked scoped paths dirty",
    );
    expect(result.details).toEqual([
      " M src/content/docs/modules/grouped-query-attention/page.mdx",
    ]);
    expect(result.repairGuidance).toContain(
      "rerun `bun run doctor:content-pr` until the final clean-tree proof passes",
    );
  });

  test("reports the supported success proof only after validation and final cleanliness pass", () => {
    const logs: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log(message) {
        logs.push(message);
      },
      logError: () => {},
      verifyRuntimeCompleteness() {
        return createSuccessfulRuntimeCompletenessResult();
      },
      runCommand(command, _options) {
        if (command[0] === "git") {
          return command[1] === "status"
            ? createGitInspectionResult(command)
            : {
                signal: null,
                status: 0,
                stdout: "",
                stderr: "",
              };
        }

        return {
          signal: null,
          status: 0,
        } satisfies ContentPrDoctorCommandResult;
      },
    });

    expect(result).toEqual({
      ok: true,
      scopedPaths: CONTENT_PR_DOCTOR_SCOPED_PATHS,
      validationSteps: CONTENT_PR_DOCTOR_VALIDATION_STEPS,
    });
    expect(logs.at(-1)).toBe(
      "[content-pr-doctor] Review-ready proof complete for .: canonical preparation + validate-data + linkcheck + clean-tree proof.",
    );
  });
});
