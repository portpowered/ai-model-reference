import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { loadPublishedDocsPages } from "@/lib/content/pages";
import { loadRegistry } from "@/lib/content/registry";
import { buildSearchDocumentsForLocale } from "@/lib/search/build-documents";
import { exportOramaIndexSnapshot } from "@/lib/search/orama-index";

const DEFAULT_LOCALE = "en";
const OUTPUT_PATH =
  process.env.SEARCH_INDEX_OUTPUT_PATH ??
  path.join(process.cwd(), "src/generated/search-index.json");
const EMIT_STDOUT = process.env.SEARCH_INDEX_OUTPUT_STDOUT === "1";

async function main() {
  const registry = await loadRegistry();
  const pages = await loadPublishedDocsPages(DEFAULT_LOCALE);
  const documents = buildSearchDocumentsForLocale(
    DEFAULT_LOCALE,
    registry,
    pages,
  );
  const snapshot = await exportOramaIndexSnapshot(documents);

  if (EMIT_STDOUT) {
    console.log(JSON.stringify(snapshot));
    return;
  }

  mkdirSync(path.dirname(OUTPUT_PATH), { recursive: true });
  writeFileSync(OUTPUT_PATH, `${JSON.stringify(snapshot)}\n`, "utf8");

  console.log(`Wrote ${documents.length} search document(s) to ${OUTPUT_PATH}`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
