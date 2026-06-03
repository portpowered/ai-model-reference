import { create, insertMultiple, save, search } from "@orama/orama";
import { toFumadocsIndexEntry } from "./to-structured-data";
import type { FumadocsSearchIndexEntry, SearchDocument } from "./types";

export type OramaSnapshotDocument = FumadocsSearchIndexEntry & {
  kind: string;
  tags: string[];
};

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

export function toOramaSnapshotDocument(
  document: SearchDocument,
): OramaSnapshotDocument {
  return {
    ...toFumadocsIndexEntry(document),
    kind: document.kind,
    tags: document.tags,
  };
}

export async function exportOramaIndexSnapshot(documents: SearchDocument[]) {
  const db = await createOramaDatabase(documents);
  const snapshot = await save(db);
  return {
    version: 1,
    language: "english",
    documents: documents.map((document) => toOramaSnapshotDocument(document)),
    orama: snapshot,
  };
}

export async function querySearchDocuments(
  documents: SearchDocument[],
  query: string,
): Promise<SearchDocument[]> {
  const db = await createOramaDatabase(documents);
  const { hits } = await search(db, { term: query });
  const urls = hits.map((hit) => (hit.document as OramaSearchRecord).url);
  const byUrl = new Map(documents.map((document) => [document.url, document]));
  return urls
    .map((url) => byUrl.get(url))
    .filter((document): document is SearchDocument => document !== undefined);
}
