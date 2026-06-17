import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { defaultLocale, type SiteLocale } from "@/lib/i18n/locale-routing";
import { getMessageString, loadPageMessages } from "./page-messages-load";
import {
  type PageAsset,
  type PageAssetConfig,
  type PageMessages,
  pageAssetConfigSchema,
} from "./schemas";

export type AssetLoadErrorDetail =
  | { type: "missing-file"; path: string }
  | { type: "parse-error"; path: string; message: string }
  | { type: "unknown-asset-id"; assetId: string; availableIds: string[] }
  | {
      type: "missing-message-key";
      assetId: string;
      messageKey: string;
      pageDirectory: string;
    };

export class AssetLoadError extends Error {
  readonly details: AssetLoadErrorDetail[];

  constructor(message: string, details: AssetLoadErrorDetail[]) {
    super(message);
    this.name = "AssetLoadError";
    this.details = details;
  }
}

function assetsFilePath(pageDirectory: string): string {
  return join(pageDirectory, "assets.json");
}

export async function loadPageAssets(
  pageDirectory: string,
): Promise<PageAssetConfig> {
  const path = assetsFilePath(pageDirectory);

  let raw: string;
  try {
    raw = await readFile(path, "utf8");
  } catch (error) {
    const code =
      error && typeof error === "object" && "code" in error
        ? (error as NodeJS.ErrnoException).code
        : undefined;
    if (code === "ENOENT") {
      throw new AssetLoadError(`Missing colocated assets file: ${path}`, [
        { type: "missing-file", path },
      ]);
    }
    const message = error instanceof Error ? error.message : String(error);
    throw new AssetLoadError(`Failed to read assets file ${path}`, [
      { type: "parse-error", path, message },
    ]);
  }

  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    throw new AssetLoadError(`Invalid JSON in assets file ${path}`, [
      { type: "parse-error", path, message },
    ]);
  }

  const result = pageAssetConfigSchema.safeParse(json);
  if (!result.success) {
    const message = result.error.issues
      .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
      .join("; ");
    throw new AssetLoadError(
      `Page asset config schema validation failed for ${path}`,
      [{ type: "parse-error", path, message }],
    );
  }

  return result.data;
}

export async function resolvePageAsset(
  pageDirectory: string,
  assetId: string,
): Promise<PageAsset> {
  const config = await loadPageAssets(pageDirectory);
  const asset = config[assetId];
  if (!asset) {
    throw new AssetLoadError(
      `Unknown asset id "${assetId}" in ${assetsFilePath(pageDirectory)}`,
      [
        {
          type: "unknown-asset-id",
          assetId,
          availableIds: Object.keys(config),
        },
      ],
    );
  }
  return asset;
}

export function assetMessageKeys(asset: PageAsset): string[] {
  const keys: string[] = [];
  if ("altKey" in asset && asset.altKey) {
    keys.push(asset.altKey);
  }
  if ("captionKey" in asset && asset.captionKey) {
    keys.push(asset.captionKey);
  }
  return keys;
}

export function validateAssetMessageKeys(
  asset: PageAsset,
  messages: PageMessages,
  context: { pageDirectory: string; assetId: string },
): void {
  const missingKeys: string[] = [];

  for (const messageKey of assetMessageKeys(asset)) {
    if (!getMessageString(messages, messageKey)) {
      missingKeys.push(messageKey);
    }
  }

  if (missingKeys.length === 0) {
    return;
  }

  const { pageDirectory, assetId } = context;
  const details: AssetLoadErrorDetail[] = missingKeys.map((messageKey) => ({
    type: "missing-message-key",
    assetId,
    messageKey,
    pageDirectory,
  }));

  throw new AssetLoadError(
    `Asset "${assetId}" in ${pageDirectory} references missing message key(s): ${missingKeys.join(", ")}`,
    details,
  );
}

export async function resolvePageAssetWithMessages(
  pageDirectory: string,
  assetId: string,
  locale: SiteLocale = defaultLocale,
): Promise<PageAsset> {
  const asset = await resolvePageAsset(pageDirectory, assetId);
  const messages = await loadPageMessages(pageDirectory, locale);
  validateAssetMessageKeys(asset, messages, { pageDirectory, assetId });
  return asset;
}
