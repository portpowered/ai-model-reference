import { describe, expect, test } from "bun:test";
import { MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS } from "@/features/models/components/module-attention-math-variable-definitions";
import {
  assertGroupedQueryAttentionChromeConvergence,
  assertGroupedQueryAttentionCompanionSectionsConvergence,
  assertGroupedQueryAttentionGraphBuildMarkersConvergence,
  assertGroupedQueryAttentionGraphThemeConvergence,
  assertGroupedQueryAttentionMathDefinitionsConvergence,
  assertGroupedQueryAttentionModuleConvergence,
  assertGroupedQueryAttentionSingleGraphConvergence,
  assertGroupedQueryAttentionTitleConvergence,
  buildGroupedQueryAttentionStubBody,
  GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS,
  GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS,
  GROUPED_QUERY_ATTENTION_GRAPH_BUILD_MARKERS,
  GROUPED_QUERY_ATTENTION_GRAPH_FORBIDDEN_MARKERS,
  GROUPED_QUERY_ATTENTION_MODULE_TITLE,
  GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS,
} from "./grouped-query-attention-module-convergence";

const PASSING_HTML = buildGroupedQueryAttentionStubBody();

const PASSING_SHELL_HTML = `
<html>
  <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
  <article data-registry-id="module.grouped-query-attention">
    ${PASSING_HTML}
  </article>
</html>
`;

describe("assertGroupedQueryAttentionGraphBuildMarkersConvergence", () => {
  test("passes when required graph build markers are present", () => {
    expect(
      assertGroupedQueryAttentionGraphBuildMarkersConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("reports the first missing graph node marker", () => {
    const html = PASSING_HTML.replace(
      'data-graph-node-id="gqa-query-heads"',
      "",
    );
    expect(assertGroupedQueryAttentionGraphBuildMarkersConvergence(html)).toBe(
      'missing expected content: data-graph-node-id="gqa-query-heads"',
    );
  });

  test("reports graph placeholder stubs", () => {
    for (const forbidden of GROUPED_QUERY_ATTENTION_GRAPH_FORBIDDEN_MARKERS) {
      const html = `${PASSING_HTML}${forbidden}`;
      expect(
        assertGroupedQueryAttentionGraphBuildMarkersConvergence(html),
      ).toBe(`unexpected content: ${forbidden}`);
    }
  });

  test("reports duplicate React Flow graph canvases", () => {
    const html = `${PASSING_HTML}<div data-react-flow-graph="true"></div>`;
    expect(assertGroupedQueryAttentionGraphBuildMarkersConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateReactFlowGraph,
    );
  });

  test("reports missing themed node CSS variables", () => {
    const html = PASSING_HTML.replaceAll("--xy-node-color", "");
    expect(assertGroupedQueryAttentionGraphBuildMarkersConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingThemedNodeColors,
    );
  });

  test("derives graph build markers from the shared required marker list", () => {
    expect(GROUPED_QUERY_ATTENTION_GRAPH_BUILD_MARKERS.length).toBeGreaterThan(
      3,
    );
    for (const marker of GROUPED_QUERY_ATTENTION_GRAPH_BUILD_MARKERS) {
      expect(GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS).toContain(marker);
    }
  });
});

describe("assertGroupedQueryAttentionTitleConvergence", () => {
  test("passes when shell title precedes registry article without body h1", () => {
    expect(
      assertGroupedQueryAttentionTitleConvergence(PASSING_SHELL_HTML),
    ).toBeNull();
  });

  test("passes when static render omits duplicate body h1", () => {
    expect(
      assertGroupedQueryAttentionTitleConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("fails when module body repeats the shell title as h1", () => {
    const html = `
      <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
      <article data-registry-id="module.grouped-query-attention">
        <h1>${GROUPED_QUERY_ATTENTION_MODULE_TITLE}</h1>
      </article>
    `;
    expect(assertGroupedQueryAttentionTitleConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateBodyTitle,
    );
  });
});

describe("assertGroupedQueryAttentionChromeConvergence", () => {
  test("passes on post-repair chrome markers", () => {
    expect(
      assertGroupedQueryAttentionChromeConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("fails when module metadata card remains", () => {
    const html = `${PASSING_HTML}<section aria-label="Module metadata"></section>`;
    expect(assertGroupedQueryAttentionChromeConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.moduleMetadataCard,
    );
  });

  test("fails on duplicate tag pill list surfaces", () => {
    const html = `${PASSING_HTML}<ul data-testid="tag-pill-list"></ul>`;
    expect(assertGroupedQueryAttentionChromeConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateTagPillList,
    );
  });

  test("fails when tag pill list marker is missing", () => {
    const html = PASSING_HTML.replace('data-testid="tag-pill-list"', "");
    expect(assertGroupedQueryAttentionChromeConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingTagPillList,
    );
  });
});

describe("assertGroupedQueryAttentionSingleGraphConvergence", () => {
  test("passes with exactly one React Flow canvas", () => {
    expect(
      assertGroupedQueryAttentionSingleGraphConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("fails when a second React Flow canvas is present", () => {
    const html = `${PASSING_HTML}<div data-react-flow-graph="true"></div>`;
    expect(assertGroupedQueryAttentionSingleGraphConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.duplicateReactFlowGraph,
    );
  });

  test("fails when React Flow canvas is missing", () => {
    const html = PASSING_HTML.replaceAll('data-react-flow-graph="true"', "");
    expect(assertGroupedQueryAttentionSingleGraphConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingReactFlowGraph,
    );
  });
});

describe("assertGroupedQueryAttentionGraphThemeConvergence", () => {
  test("passes when themed node CSS variables are present", () => {
    expect(
      assertGroupedQueryAttentionGraphThemeConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("fails when themed node background color variable is missing", () => {
    const html = PASSING_HTML.replaceAll("--xy-node-background-color", "");
    expect(assertGroupedQueryAttentionGraphThemeConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingThemedNodeColors,
    );
  });
});

describe("assertGroupedQueryAttentionMathDefinitionsConvergence", () => {
  test("passes when all math variable definition markers are present", () => {
    expect(
      assertGroupedQueryAttentionMathDefinitionsConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("fails when a math variable definition marker is missing", () => {
    const html = PASSING_HTML.replace(
      'data-math-variable-definition="grouping"',
      "",
    );
    expect(assertGroupedQueryAttentionMathDefinitionsConvergence(html)).toBe(
      GROUPED_QUERY_ATTENTION_CONVERGENCE_REASONS.missingMathDefinitions,
    );
  });

  test("documents every required math variable definition id", () => {
    for (const id of MODULE_ATTENTION_MATH_VARIABLE_DEFINITION_IDS) {
      expect(PASSING_HTML).toContain(`data-math-variable-definition="${id}"`);
    }
  });
});

describe("assertGroupedQueryAttentionCompanionSectionsConvergence", () => {
  test("passes when attention bridge, comparison table, and related docs are present", () => {
    expect(
      assertGroupedQueryAttentionCompanionSectionsConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("reports missing attention bridge link", () => {
    const html = PASSING_HTML.replace('href="/docs/modules/attention"', "");
    expect(assertGroupedQueryAttentionCompanionSectionsConvergence(html)).toBe(
      'missing expected content: href="/docs/modules/attention"',
    );
  });
});

describe("assertGroupedQueryAttentionModuleConvergence", () => {
  test("passes when required markers are present and forbidden markers absent", () => {
    expect(
      assertGroupedQueryAttentionModuleConvergence(PASSING_HTML),
    ).toBeNull();
  });

  test("passes on shell-wrapped post-repair module HTML", () => {
    expect(
      assertGroupedQueryAttentionModuleConvergence(PASSING_SHELL_HTML),
    ).toBeNull();
  });

  test("reports the first missing required marker", () => {
    const html = PASSING_HTML.replace(GROUPED_QUERY_ATTENTION_MODULE_TITLE, "");
    expect(assertGroupedQueryAttentionModuleConvergence(html)).toBe(
      `missing expected content: ${GROUPED_QUERY_ATTENTION_MODULE_TITLE}`,
    );
  });

  test("reports forbidden placeholder stubs and removed section heading", () => {
    for (const forbidden of GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS) {
      const html = `${PASSING_HTML}${forbidden}`;
      expect(assertGroupedQueryAttentionModuleConvergence(html)).toBe(
        `unexpected content: ${forbidden}`,
      );
    }
  });

  test("rejects lorem placeholder copy", () => {
    expect(
      assertGroupedQueryAttentionModuleConvergence(
        `${PASSING_HTML}<p>lorem ipsum</p>`,
      ),
    ).toBe("placeholder lorem copy detected");
  });

  test("documents the required marker contract", () => {
    expect(GROUPED_QUERY_ATTENTION_REQUIRED_MARKERS.length).toBeGreaterThan(20);
    expect(GROUPED_QUERY_ATTENTION_FORBIDDEN_MARKERS.length).toBeGreaterThan(4);
  });
});
