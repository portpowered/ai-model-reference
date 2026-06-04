import axe from "axe-core";

const SERIOUS_IMPACTS = new Set(["serious", "critical"]);

export type AxeRunOptions = {
  /** axe-core `exclude` selectors, relative to the scanned element. */
  exclude?: string[][];
};

export async function runAxeOnElement(
  element: Element,
  options: AxeRunOptions = {},
): Promise<axe.AxeResults> {
  return axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    },
    ...(options.exclude ? { exclude: options.exclude } : {}),
  });
}

export function getSeriousViolations(results: axe.AxeResults): axe.Result[] {
  return results.violations.filter((violation) => {
    const impact = violation.impact;
    return (
      impact !== null && impact !== undefined && SERIOUS_IMPACTS.has(impact)
    );
  });
}

function formatSeriousViolations(serious: axe.Result[]): string {
  return serious
    .map(
      (violation) =>
        `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes.map((node) => node.target.join(", ")).join("; ")}`,
    )
    .join("\n");
}

export async function expectNoSeriousAxeViolations(
  element: Element,
  options: AxeRunOptions = {},
): Promise<void> {
  const results = await runAxeOnElement(element, options);
  const serious = getSeriousViolations(results);
  if (serious.length > 0) {
    throw new Error(
      `Serious axe violations:\n${formatSeriousViolations(serious)}`,
    );
  }
}

export async function expectSeriousAxeViolations(
  element: Element,
): Promise<void> {
  const results = await runAxeOnElement(element);
  const serious = getSeriousViolations(results);
  if (serious.length === 0) {
    throw new Error("Expected serious axe violations but found none");
  }
}
