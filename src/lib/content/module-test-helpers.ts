import { expect } from "bun:test";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Extracts a module article region from shell or built-route HTML. */
export function extractModuleArticleHtml(
  html: string,
  registryId: string,
): string {
  const match = html.match(
    new RegExp(
      `<article[^>]*data-registry-id="${escapeRegExp(registryId)}"[^>]*>[\\s\\S]*?</article>`,
    ),
  );
  return match?.[0] ?? "";
}

function extractSectionHtml(html: string, sectionId: string): string {
  const match = html.match(
    new RegExp(
      `<section[^>]*\\bid="${escapeRegExp(sectionId)}"[^>]*>[\\s\\S]*?</section>`,
    ),
  );
  return match?.[0] ?? "";
}

/** Module pages render TagPillList once in the dedicated tags section. */
export function expectModuleSingleTagPillList(html: string): void {
  expect((html.match(/data-testid="tag-pill-list"/g) ?? []).length).toBe(1);
  expect(html).toContain('aria-label="Tags"');
  expect(html).toContain('id="tags"');
}

/** Tag pill list must live inside the tags section, not in opening chrome. */
export function expectModuleTagPillListOnlyInTagsSection(html: string): void {
  expectModuleSingleTagPillList(html);

  const tagsSection = extractSectionHtml(html, "tags");
  expect(tagsSection).toContain('data-testid="tag-pill-list"');

  const tagPillIndex = html.indexOf('data-testid="tag-pill-list"');
  const tagsSectionIndex = html.indexOf('id="tags"');
  expect(tagPillIndex).toBeGreaterThan(tagsSectionIndex);

  const atAGlanceIndex = html.indexOf('aria-label="At a glance"');
  if (atAGlanceIndex >= 0) {
    expect(tagPillIndex).toBeGreaterThan(atAGlanceIndex);
  }
}

/** Module pages render exactly one React Flow graph canvas. */
export function expectModuleSingleReactFlowGraph(html: string): void {
  expect((html.match(/data-react-flow-graph="true"/g) ?? []).length).toBe(1);
}

/** Compute-flow graph must live in How It Works, not in the math/schema section. */
export function expectModuleComputeFlowGraphOnlyInHowItWorks(
  html: string,
  graphId: string,
): void {
  expectModuleSingleReactFlowGraph(html);
  expect(html).toContain(`data-graph-id="${graphId}"`);

  const howItWorksSection = extractSectionHtml(html, "how-it-works");
  expect(howItWorksSection).toContain('data-react-flow-graph="true"');
  expect(howItWorksSection).toContain(`data-graph-id="${graphId}"`);

  const mathSection = extractSectionHtml(html, "math-or-compute-schema");
  expect(mathSection).not.toContain('data-react-flow-graph="true"');
  expect(mathSection).not.toContain(`data-graph-id="${graphId}"`);
  expect(mathSection).not.toContain(
    `data-graph-id="${graphId.replace("-flow", "-schema")}"`,
  );
}
