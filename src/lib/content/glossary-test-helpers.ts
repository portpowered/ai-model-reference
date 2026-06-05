import { expect } from "bun:test";

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Glossary MDX bodies must not repeat the shell DocsTitle as an in-body h1. */
export function expectGlossaryBodyOmitsTitleHeading(
  html: string,
  title: string,
): void {
  expect(html).not.toMatch(
    new RegExp(`<h1\\b[^>]*>\\s*${escapeRegExp(title)}\\s*</h1>`, "i"),
  );
}

/** Glossary pages render one message-key-driven opening summary paragraph. */
export function expectGlossaryOpeningSummary(
  html: string,
  openingSummary: string,
): void {
  expect(html).toContain('data-testid="glossary-opening"');
  expect(html).toContain(openingSummary);
}

export function expectGlossaryOpeningSummaryMessage(messages: {
  openingSummary?: string;
}): void {
  expect(messages.openingSummary?.length).toBeGreaterThan(0);
}
