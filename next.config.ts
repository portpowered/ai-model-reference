import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { resolveNextConfigForBuildMode } from "./src/lib/build/static-export";

const withMDX = createMDX();

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  ...resolveNextConfigForBuildMode(),
  turbopack: {
    root: projectRoot,
  },
};

export default withMDX(nextConfig);
