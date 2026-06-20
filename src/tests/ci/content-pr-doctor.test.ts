import { describe, expect, test } from "bun:test";
import {
  CONTENT_PR_DOCTOR_SCOPED_PATHS,
  CONTENT_PR_DOCTOR_VALIDATION_STEPS,
  type ContentPrDoctorCommandResult,
  runContentPrDoctor,
} from "@/lib/content/content-pr-doctor";

const repoRoot = import.meta.dir;

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
      runCommand(command, _options) {
        commands.push(command.join(" "));
        if (command[0] === "git") {
          return {
            signal: null,
            status: 0,
            stdout: "",
          } satisfies ContentPrDoctorCommandResult;
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
      ]),
    );
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining(
          "Stage 1/4: preflight-cleanliness - verify the tracked content and derived-artifact paths are clean before regeneration starts",
        ),
        expect.stringContaining(
          "Stage 2/4: prepare-content-runtime - run the canonical content-runtime preparation path in fixed order",
        ),
        expect.stringContaining(
          "Stage 3/4: narrow-validation - run the narrow content PR validation checks expected for review readiness",
        ),
        expect.stringContaining(
          "Stage 4/4: final-cleanliness - prove the tracked content and derived-artifact paths are still clean after preparation and validation",
        ),
      ]),
    );
    expect(commands).toEqual([
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      "bun run generate:shipped-localized-docs",
      "bun run generate:published-docs-registry",
      "bun run generate:graph-registry-runtime",
      "bun run generate:registry-runtime",
      "bun run generate:table-registry",
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      ...CONTENT_PR_DOCTOR_VALIDATION_STEPS.map((step) =>
        step.command.join(" "),
      ),
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    ]);
  });

  test("fails early when tracked scoped paths are already dirty", () => {
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
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
    expect(result.details).toEqual([
      " M src/content/docs/modules/grouped-query-attention/page.mdx",
    ]);
    expect(result.repairGuidance).toContain(
      "Review, commit, stash, or discard",
    );
  });

  test("does not start preparation when preflight finds scoped tracked changes", () => {
    const commands: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      runCommand(command, _options) {
        commands.push(command.join(" "));

        return {
          signal: null,
          status: 0,
          stdout:
            command[0] === "git"
              ? " M src/lib/content/generated/registry-runtime.generated.ts\n"
              : "",
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

  test("fails at the preparation stage when canonical generation leaves scoped drift", () => {
    const commands: string[] = [];
    let gitStatusCallCount = 0;
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
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
    expect(result.details).toEqual([
      " M src/lib/content/generated/registry-runtime.generated.ts",
    ]);
    expect(result.repairGuidance).toContain("bun run prepare:content-runtime");
    expect(commands).toEqual([
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      "bun run generate:shipped-localized-docs",
      "bun run generate:published-docs-registry",
      "bun run generate:graph-registry-runtime",
      "bun run generate:registry-runtime",
      "bun run generate:table-registry",
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
    ]);
  });

  test("identifies the failed narrow validation step and reports repair guidance", () => {
    const commands: string[] = [];
    const logs: string[] = [];
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log(message) {
        logs.push(message);
      },
      logError: () => {},
      runCommand(command, _options) {
        commands.push(command.join(" "));

        if (command[0] === "git") {
          return {
            signal: null,
            status: 0,
            stdout: "",
          } satisfies ContentPrDoctorCommandResult;
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
    expect(logs).toEqual(
      expect.arrayContaining([
        expect.stringContaining("Running validate-data"),
        expect.stringContaining("Running linkcheck"),
      ]),
    );
    expect(commands).toEqual([
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      "bun run generate:shipped-localized-docs",
      "bun run generate:published-docs-registry",
      "bun run generate:graph-registry-runtime",
      "bun run generate:registry-runtime",
      "bun run generate:table-registry",
      `git status --porcelain --untracked-files=no -- ${CONTENT_PR_DOCTOR_SCOPED_PATHS.join(
        " ",
      )}`,
      "bun run validate-data",
      "bun run linkcheck",
    ]);
  });

  test("fails the final clean-tree proof when validation leaves tracked scoped drift", () => {
    let gitStatusCallCount = 0;
    const result = runContentPrDoctor({
      cwd: repoRoot,
      log: () => {},
      logError: () => {},
      runCommand(command, _options) {
        if (command[0] === "git") {
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
      runCommand(command, _options) {
        if (command[0] === "git") {
          return {
            signal: null,
            status: 0,
            stdout: "",
          } satisfies ContentPrDoctorCommandResult;
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
