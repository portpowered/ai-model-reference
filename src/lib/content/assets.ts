import type { z } from "zod";
import { lookupMessage } from "./messages";
import {
  type PageAsset,
  type PageAssetConfig,
  type PageMessages,
  pageAssetConfigSchema,
} from "./schemas";

export type MissingAssetReason = "missing" | "invalid";

export type AssetLookupResult =
  | { ok: true; assetId: string; asset: PageAsset }
  | { ok: false; assetId: string; reason: MissingAssetReason };

export type ResolvedAssetText = {
  alt?: string;
  caption?: string;
};

export type AssetValidationIssue = {
  assetId: string;
  field: string;
  message: string;
};

export class MissingAssetIdError extends Error {
  readonly assetId: string;

  constructor(assetId: string) {
    super(`Missing asset ID: ${assetId}`);
    this.name = "MissingAssetIdError";
    this.assetId = assetId;
  }
}

export class InvalidPageAssetConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InvalidPageAssetConfigError";
  }
}

export function parsePageAssetConfig(raw: unknown): PageAssetConfig {
  const result = pageAssetConfigSchema.safeParse(raw);
  if (!result.success) {
    throw new InvalidPageAssetConfigError(
      formatZodAssetConfigError(result.error),
    );
  }
  return result.data;
}

export function lookupAsset(
  config: PageAssetConfig,
  assetId: string,
): AssetLookupResult {
  const asset = config[assetId];
  if (asset === undefined) {
    return { ok: false, assetId, reason: "missing" };
  }
  return { ok: true, assetId, asset };
}

export function resolveAsset(
  config: PageAssetConfig,
  assetId: string,
): PageAsset {
  const result = lookupAsset(config, assetId);
  if (result.ok) {
    return result.asset;
  }
  throw new MissingAssetIdError(assetId);
}

export function resolveAssetText(
  messages: PageMessages,
  asset: PageAsset,
): ResolvedAssetText {
  const altKey = "altKey" in asset ? asset.altKey : undefined;
  const captionKey = "captionKey" in asset ? asset.captionKey : undefined;

  const alt = altKey ? resolveOptionalMessage(messages, altKey) : undefined;
  const caption = captionKey
    ? resolveOptionalMessage(messages, captionKey)
    : undefined;

  return { alt, caption };
}

export function validatePageAssetReferences(
  config: PageAssetConfig,
  messages: PageMessages,
): AssetValidationIssue[] {
  const issues: AssetValidationIssue[] = [];

  for (const [assetId, asset] of Object.entries(config)) {
    if ("altKey" in asset && asset.altKey) {
      const altResult = lookupMessage(messages, asset.altKey);
      if (!altResult.ok) {
        issues.push({
          assetId,
          field: "altKey",
          message: `Asset "${assetId}" references missing alt key "${asset.altKey}"`,
        });
      }
    }

    if ("captionKey" in asset && asset.captionKey) {
      const captionResult = lookupMessage(messages, asset.captionKey);
      if (!captionResult.ok) {
        issues.push({
          assetId,
          field: "captionKey",
          message: `Asset "${assetId}" references missing caption key "${asset.captionKey}"`,
        });
      }
    }
  }

  return issues;
}

function resolveOptionalMessage(
  messages: PageMessages,
  key: string,
): string | undefined {
  const result = lookupMessage(messages, key);
  return result.ok ? result.value : undefined;
}

function formatZodAssetConfigError(error: z.ZodError): string {
  const details = error.issues
    .map((issue) => {
      const path = issue.path.length > 0 ? issue.path.join(".") : "root";
      return `${path}: ${issue.message}`;
    })
    .join("; ");
  return `Invalid page asset config: ${details}`;
}

export function formatMissingAssetId(
  assetId: string,
  reason: MissingAssetReason = "missing",
): string {
  const detail = reason === "invalid" ? " (invalid config)" : "";
  return `Missing asset ID: ${assetId}${detail}`;
}
