import { describe, expect, test } from "bun:test";
import {
  type RunYouJsonCommand,
  readCompleteLiveWorkListSnapshotJson,
} from "@/lib/factory/live-queue-snapshot";

describe("live-queue-snapshot", () => {
  test("follows paginationContext.nextToken until the live work list snapshot is complete", () => {
    const commands: string[] = [];
    const runCommand: RunYouJsonCommand = (_repoRoot, args) => {
      commands.push(args.join(" "));

      if (args.includes("--next-token")) {
        return {
          ok: true,
          stdout: JSON.stringify({
            results: [
              {
                workId: "task-beta",
                name: "beta",
                state: { name: "failed", type: "FAILED" },
              },
            ],
          }),
          stderr: "",
          exitCode: 0,
        };
      }

      return {
        ok: true,
        stdout: JSON.stringify({
          results: [
            {
              workId: "task-alpha",
              name: "alpha",
              state: { name: "in-review", type: "PROCESSING" },
            },
          ],
          paginationContext: {
            nextToken: "cursor-page-2",
          },
        }),
        stderr: "",
        exitCode: 0,
      };
    };

    const snapshotJson = readCompleteLiveWorkListSnapshotJson(
      "/repo",
      ["work", "list", "--session", "~default"],
      runCommand,
    );

    expect(commands).toEqual([
      "work list --session ~default --json",
      "work list --session ~default --next-token cursor-page-2 --json",
    ]);
    expect(JSON.parse(snapshotJson)).toEqual({
      items: [
        {
          workId: "task-alpha",
          name: "alpha",
          state: { name: "in-review", type: "PROCESSING" },
        },
        {
          workId: "task-beta",
          name: "beta",
          state: { name: "failed", type: "FAILED" },
        },
      ],
      snapshotCompleteness: {
        pageCount: 2,
        source: "you work list live pagination",
        complete: true,
      },
    });
  });

  test("throws an explicit error when a paginated continuation page cannot be read", () => {
    const runCommand: RunYouJsonCommand = (_repoRoot, args) => {
      if (args.includes("--next-token")) {
        return {
          ok: false,
          stdout: "",
          stderr: "temporary upstream failure",
          exitCode: 1,
        };
      }

      return {
        ok: true,
        stdout: JSON.stringify({
          items: [{ name: "alpha", state: "active" }],
          paginationContext: { nextToken: "cursor-page-2" },
        }),
        stderr: "",
        exitCode: 0,
      };
    };

    expect(() =>
      readCompleteLiveWorkListSnapshotJson(
        "/repo",
        ["work", "list", "--session", "~default"],
        runCommand,
      ),
    ).toThrow(
      'Unable to read work list continuation page for nextToken "cursor-page-2"',
    );
  });
});
