import { describe, expect, test } from "bun:test";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const repoRoot = join(import.meta.dir, "../../..");
const examplePath = join(repoRoot, "factory/docs/batch-input-example.json");

function runYou(args: string[]) {
  return spawnSync("you", args, {
    cwd: repoRoot,
    encoding: "utf8",
    env: process.env,
  });
}

describe("factory batch input example", () => {
  test("checked-in example uses canonical FACTORY_REQUEST_BATCH shape", () => {
    const batch = JSON.parse(readFileSync(examplePath, "utf8")) as {
      requestId: string;
      type: string;
      works: Array<{
        name: string;
        workTypeName: string;
        payload: string;
      }>;
      relations: Array<{
        type: string;
        sourceWorkName: string;
        targetWorkName: string;
        requiredState?: string;
      }>;
    };

    expect(batch.type).toBe("FACTORY_REQUEST_BATCH");
    expect(batch.requestId).toBeTruthy();
    expect(batch.works).toHaveLength(3);

    const ideaWorks = batch.works.filter(
      (work) => work.workTypeName === "idea",
    );
    expect(ideaWorks).toHaveLength(2);
    expect(new Set(ideaWorks.map((work) => work.name)).size).toBe(2);

    const loopback = batch.works.find(
      (work) => work.workTypeName === "thoughts",
    );
    if (!loopback) {
      throw new Error("expected one thoughts loopback work item");
    }

    expect(batch.relations).toHaveLength(2);
    for (const relation of batch.relations) {
      expect(relation.type).toBe("DEPENDS_ON");
      expect(relation.sourceWorkName).toBe(loopback.name);
      expect(
        ideaWorks.some((work) => work.name === relation.targetWorkName),
      ).toBe(true);
    }

    const serialized = JSON.stringify(batch);
    expect(serialized).not.toMatch(/"workType"/);
    expect(serialized).not.toMatch(/"items"/);
    expect(serialized).not.toMatch(/"work_type_id"/);
    expect(serialized).not.toMatch(/"target_state"/);
  });

  test("you submit batch --dry-run accepts the checked-in example without sending work", () => {
    const result = runYou([
      "submit",
      "batch",
      "--dry-run",
      "factory/docs/batch-input-example.json",
    ]);

    expect(result.status).toBe(0);
    const output = `${result.stdout}${result.stderr}`;
    expect(output).toContain("requestId: factory-docs-batch-example-001");
    expect(output).toContain("work count: 3");
    expect(output).toContain(
      "works: example-idea-module-page, example-idea-concept-crosslink, example-loopback-thoughts",
    );
    expect(output).toContain("relationCount: 2");
    expect(output).toContain("dry-run: no request sent");
  });
});
