import { describe, expect, test } from "bun:test";
import {
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
      "git status --porcelain --untracked-files=no -- src/content src/lib/content/generated",
      "bun run generate:shipped-localized-docs",
      "bun run generate:published-docs-registry",
      "bun run generate:graph-registry-runtime",
      "bun run generate:registry-runtime",
      "bun run generate:table-registry",
      ...CONTENT_PR_DOCTOR_VALIDATION_STEPS.map((step) =>
        step.command.join(" "),
      ),
      "git status --porcelain --untracked-files=no -- src/content src/lib/content/generated",
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
});
