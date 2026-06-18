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
  const openTag = new RegExp(
    `<section[^>]*\\bid="${escapeRegExp(sectionId)}"[^>]*>`,
    "i",
  );
  const match = openTag.exec(html);
  if (!match || match.index === undefined) {
    return "";
  }

  const startIndex = match.index;
  let depth = 1;
  let pos = match.index + match[0].length;

  while (pos < html.length && depth > 0) {
    const nextOpen = html.indexOf("<section", pos);
    const nextClose = html.indexOf("</section>", pos);

    if (nextClose === -1) {
      break;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + "<section".length;
    } else {
      depth--;
      pos = nextClose + "</section>".length;
      if (depth === 0) {
        return html.slice(startIndex, pos);
      }
    }
  }

  return "";
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

/** Symbol-level math variable definitions must live under each formula in the math section. */
export function expectModuleMathSchemaDefinitionsInMathSection(
  html: string,
  mhaDefinitionIds: readonly string[],
  gqaDefinitionIds: readonly string[],
): void {
  const mathSection = extractSectionHtml(html, "math-or-compute-schema");
  expect(mathSection).toContain('data-attention-schema-comparison="true"');
  expect(mathSection).toContain(
    'data-attention-schema-variable-definitions="true"',
  );
  expect(mathSection).toContain('data-math-schema="mha"');
  expect(mathSection).toContain('data-math-schema="gqa"');
  for (const id of mhaDefinitionIds) {
    expect(mathSection).toContain(`data-math-variable-definition="${id}"`);
  }
  for (const id of gqaDefinitionIds) {
    expect(mathSection).toContain(`data-math-variable-definition="${id}"`);
  }
  expect(mathSection).toContain(
    'data-message-block-math="math.mhaSchema.formula"',
  );
  expect(mathSection).toContain(
    'data-message-block-math="math.gqaSchema.formula"',
  );
  expect(mathSection).not.toContain("Query projection");
  expect(mathSection).not.toContain("Key projection");
  expect(mathSection).not.toContain("Value projection");
  expect(mathSection).not.toContain("Query-to-KV grouping");
}

/** Companion sections: attention bridge, comparison table, and curated related docs. */
export function expectModuleCompanionSections(html: string): void {
  expect(html).toContain('href="/docs/modules/attention"');
  expect(html).toContain('href="/docs/modules/multi-head-attention"');
  expect(html).toContain('href="/docs/modules/multi-query-attention"');
  expect(html).toContain('data-testid="curated-related-docs"');
  expect(html).toContain('data-testid="citation-list"');
  expect(html).toContain('data-registry-comparison-table="true"');
  expect(html).toContain(
    'data-table-id="table.grouped-query-attention-comparison"',
  );
  expect(html).toContain('data-comparison-dimension="cacheFootprint"');
  expect(html).toContain("Key-value head count");
  expect(html).toContain('id="compared-to-nearby-modules"');
  expect(html).toContain('id="related"');
}

/** Attention-variant comparison graph must expose themed React Flow markers. */
export function expectModuleAttentionVariantGraphTheme(
  html: string,
  graphId: string,
): void {
  expect(html).toContain('data-attention-variant-comparison="true"');
  expect(html).toContain('data-attention-variant-active="gqa"');
  expect(html).toContain('data-attention-variant-option="mha"');
  expect(html).toContain('data-attention-variant-option="gqa"');
  expect(html).toContain(`data-graph-id="${graphId}"`);
  expect(html).toContain("--xy-background-color:#ffffff");
  expect(html).toContain("--xy-node-color:#111827");
  expect(html).toContain("--xy-node-background-color:#ffffff");
  expect(html).toContain("--xy-node-border-color:#cbd5e1");
  expect(html).toContain(
    'data-manual-visibility-evidence="registry-graph-flow-node-contrast"',
  );

  const howItWorksSection = extractSectionHtml(html, "how-it-works");
  expect(howItWorksSection).toContain(
    'data-attention-variant-comparison="true"',
  );
  expect(howItWorksSection).toContain(`data-graph-id="${graphId}"`);
  expect(howItWorksSection).toContain("--xy-background-color:#ffffff");
  expect(howItWorksSection).toContain("--xy-node-color:#111827");
  expect(howItWorksSection).toContain("--xy-node-background-color:#ffffff");
  expect(howItWorksSection).toContain("--xy-node-border-color:#cbd5e1");
  expect(howItWorksSection).toContain('class="registry-graph-flow');
  expect(howItWorksSection).toContain('data-graph-node-id="gqa-query-heads"');
  expect(howItWorksSection).toContain('data-graph-node-id="gqa-kv-groups"');
  expect(howItWorksSection).toContain('data-head-count-role="query"');
  expect(howItWorksSection).toContain('data-head-count-role="kv"');
  expect(howItWorksSection).toContain('data-graph-node-count="11"');
}

/** @deprecated Use expectModuleAttentionVariantGraphTheme */
export function expectModuleComputeFlowGraphTheme(
  html: string,
  graphId: string,
): void {
  expectModuleAttentionVariantGraphTheme(html, graphId);
}
