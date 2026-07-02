import { describe, expect, test } from "bun:test";
import {
  PLACEHOLDER_SIDEBAR_DESCRIPTION,
  TOKEN_GLOSSARY_URL,
} from "@/lib/navigation/docs-sidebar-contract";
import {
  assertDocsShellConvergence,
  DOCS_SHELL_CONVERGENCE_REASONS,
} from "./docs-shell-convergence";

const UNIFIED_SHELL_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <div id="nd-sidebar">
    <span>Modules</span>
    <span>Glossary</span>
    <a href="${TOKEN_GLOSSARY_URL}">Token</a>
  </div>
  <div id="nd-page"><article>Docs content</article></div>
`;

const SPLIT_SHELL_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <aside aria-label="Docs sidebar">
    <p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>
  </aside>
  <article>Index content without Fumadocs regions</article>
`;

const PLACEHOLDER_WITH_POPULATED_LABELS_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <div id="nd-sidebar">
    <span>Modules</span>
    <span>Glossary</span>
    <p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>
    <a href="${TOKEN_GLOSSARY_URL}">Token</a>
  </div>
  <div id="nd-page"><article>Docs content</article></div>
`;

const COLLAPSED_SHELL_HTML = `
  <header><nav aria-label="Primary">Model Atlas</nav></header>
  <div id="nd-sidebar">
    <span>Modules</span>
    <span>Glossary</span>
  </div>
  <div id="nd-page"><article>Docs content</article></div>
  <script>self.__next_f.push(["href","${TOKEN_GLOSSARY_URL}"])</script>
`;

describe("assertDocsShellConvergence", () => {
  test("passes on unified Fumadocs shell fixtures", () => {
    expect(assertDocsShellConvergence(UNIFIED_SHELL_HTML)).toBeNull();
  });

  test("passes when collapsed built sidebars carry page links outside visible sidebar markup", () => {
    expect(assertDocsShellConvergence(COLLAPSED_SHELL_HTML)).toBeNull();
  });

  test("fails split-shell fixtures without nd-sidebar markers", () => {
    expect(assertDocsShellConvergence(SPLIT_SHELL_HTML)).toBe(
      DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar,
    );
  });

  test("fails legacy placeholder sidebar fixtures with stable reasons", () => {
    expect(
      assertDocsShellConvergence(PLACEHOLDER_WITH_POPULATED_LABELS_HTML),
    ).toBe(DOCS_SHELL_CONVERGENCE_REASONS.legacyPlaceholderSidebar);

    const legacyOnlyHtml = `
      <header><nav aria-label="Primary">Home</nav></header>
      <aside aria-label="Docs sidebar">
        <p>${PLACEHOLDER_SIDEBAR_DESCRIPTION}</p>
      </aside>
    `;
    expect(assertDocsShellConvergence(legacyOnlyHtml)).toBe(
      DOCS_SHELL_CONVERGENCE_REASONS.missingNdSidebar,
    );
  });

  test("reports missing Modules and Glossary labels independently", () => {
    const missingModulesHtml = UNIFIED_SHELL_HTML.replace(
      ">Modules<",
      ">Other<",
    );
    expect(assertDocsShellConvergence(missingModulesHtml)).toBe(
      DOCS_SHELL_CONVERGENCE_REASONS.missingModulesLabel,
    );

    const missingGlossaryHtml = UNIFIED_SHELL_HTML.replace(
      ">Glossary<",
      ">Other<",
    );
    expect(assertDocsShellConvergence(missingGlossaryHtml)).toBe(
      DOCS_SHELL_CONVERGENCE_REASONS.missingGlossaryLabel,
    );
  });
});
