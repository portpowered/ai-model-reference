import { describe, expect, test } from "bun:test";
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  getDocsPageDir,
  getModelsDocsRoot,
  getRegistryRoot,
} from "@/lib/content/content-paths";
import { loadRegistry } from "@/lib/content/registry";
import { getPublishedDocsRegistryIds } from "@/lib/content/registry-runtime";

const MODEL_SLUG = "whisper";
const MODEL_ID = "model.whisper";

const WHISPER_ALTERNATE_SLUGS = [
  "openai-whisper",
  "whisper-asr",
  "whisper-model",
] as const;

describe("Whisper duplicate guard (whisper-model-page-current-main-001)", () => {
  test("preflight confirms at most one page bundle directory before authoring", () => {
    const pageDir = getDocsPageDir("models", MODEL_SLUG);
    const registryPath = join(
      getRegistryRoot(),
      "models",
      `${MODEL_SLUG}.json`,
    );
    const pageExists = existsSync(pageDir);
    const registryExists = existsSync(registryPath);

    if (pageExists) {
      expect(existsSync(join(pageDir, "page.mdx"))).toBe(true);
    }
    if (registryExists) {
      expect(registryExists).toBe(true);
    }

    const whisperLikeDirs = readdirSync(getModelsDocsRoot(), {
      withFileTypes: true,
    })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name)
      .filter((name) => name === MODEL_SLUG || name.includes("whisper"));

    expect(whisperLikeDirs).toEqual(pageExists ? [MODEL_SLUG] : []);
  });

  test("keeps a single canonical model.whisper registry record without alternate slugs", async () => {
    const indexes = await loadRegistry();
    const whisperMatches = [...indexes.byId.values()].filter(
      (record) =>
        record.id === MODEL_ID ||
        record.slug === MODEL_SLUG ||
        (record.kind === "model" &&
          record.aliases?.some((alias) => alias.toLowerCase() === "whisper")),
    );

    expect(whisperMatches.length).toBeLessThanOrEqual(1);

    if (whisperMatches.length === 1) {
      const record = whisperMatches[0];
      expect(record?.id).toBe(MODEL_ID);
      expect(record?.slug).toBe(MODEL_SLUG);
      expect(indexes.bySlug.get(MODEL_SLUG)?.id).toBe(MODEL_ID);
    }

    for (const alternateSlug of WHISPER_ALTERNATE_SLUGS) {
      const alternate = indexes.bySlug.get(alternateSlug);
      expect(alternate?.id).not.toBe(MODEL_ID);
    }
  });

  test("published docs registry exposes at most one Whisper model route", () => {
    const publishedIds = getPublishedDocsRegistryIds();
    const whisperPublished = publishedIds.has(MODEL_ID);

    const duplicateWhisperRoutes = [...publishedIds].filter((id) =>
      id.toLowerCase().includes("whisper"),
    );
    expect(duplicateWhisperRoutes).toEqual(whisperPublished ? [MODEL_ID] : []);
  });
});
