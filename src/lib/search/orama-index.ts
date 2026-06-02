import { create, insertMultiple, save } from "@orama/orama";
import { toFumadocsIndexEntry } from "./to-structured-data";
import type { SearchDocument } from "./types";

const oramaSchema = {
  id: "string",
  title: "string",
  description: "string",
  url: "string",
  kind: "string",
  body: "string",
  aliases: "string",
  tags: "string",
} as const;

export type OramaSearchRecord = {
  id: string;
  title: string;
  description: string;
  url: string;
  kind: string;
  body: string;
  aliases: string;
  tags: string;
};

export function toOramaRecord(document: SearchDocument): OramaSearchRecord {
  const entry = toFumadocsIndexEntry(document);
  const structuredText = entry.structuredData.contents
    .map((block) => block.content)
    .join("\n");

  return {
    id: document.id,
    title: document.title,
    description: document.description,
    url: document.url,
    kind: document.kind,
    body: [document.bodyText, structuredText].filter(Boolean).join("\n"),
    aliases: document.aliases.join(" "),
    tags: document.tags.join(" "),
  };
}

export async function createOramaDatabase(documents: SearchDocument[]) {
  const db = await create({
    schema: oramaSchema,
  });

  await insertMultiple(
    db,
    documents.map((document) => toOramaRecord(document)),
  );

  return db;
}

export async function exportOramaIndexSnapshot(documents: SearchDocument[]) {
  const db = await createOramaDatabase(documents);
  const snapshot = await save(db);
  return {
    version: 1,
    language: "english",
    documents: documents.map((document) => toFumadocsIndexEntry(document)),
    orama: snapshot,
  };
}
