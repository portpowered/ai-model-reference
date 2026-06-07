import type { NextConfig } from "next";

export const STATIC_EXPORT_ENV = "NEXT_STATIC_EXPORT";

export type BuildModeEnv = Record<string, string | undefined>;

export function isStaticExportBuild(env: BuildModeEnv = process.env): boolean {
  return env[STATIC_EXPORT_ENV] === "1";
}

export const staticExportNextConfig = {
  output: "export",
  images: { unoptimized: true },
} as const satisfies Pick<NextConfig, "output" | "images">;

export function resolveNextConfigForBuildMode(
  env: BuildModeEnv = process.env,
): Pick<NextConfig, "output" | "images"> | Record<string, never> {
  return isStaticExportBuild(env) ? staticExportNextConfig : {};
}
