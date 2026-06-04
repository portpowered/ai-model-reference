import axe from "axe-core";

const SERIOUS_IMPACTS = new Set(["serious", "critical"]);

export async function runAxeOnElement(
  element: Element,
): Promise<axe.AxeResults> {
  return axe.run(element, {
    runOnly: {
      type: "tag",
      values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "best-practice"],
    },
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

export async function expectNoSeriousAxeViolations(
  element: Element,
): Promise<void> {
  const results = await runAxeOnElement(element);
  const serious = getSeriousViolations(results);
  if (serious.length > 0) {
    const summary = serious
      .map(
        (violation) =>
          `${violation.id} (${violation.impact}): ${violation.help} — ${violation.nodes.map((node) => node.target.join(", ")).join("; ")}`,
      )
      .join("\n");
    throw new Error(`Serious axe violations:\n${summary}`);
  }
}
