import path from "node:path";
import { fileURLToPath } from "node:url";
import { createMDX } from "fumadocs-mdx/next";
import type { NextConfig } from "next";
import { resolveNextConfigForBuildMode } from "./src/lib/build/static-export";
import {
  DOCS_SEARCH_BOOTSTRAP_FROM_ENV,
  resolveDocsSearchStaticBootstrapFrom,
} from "./src/lib/search/docs-search-bootstrap-path";

const withMDX = createMDX();

const projectRoot = path.dirname(fileURLToPath(import.meta.url));

const nextConfig: NextConfig = {
  ...resolveNextConfigForBuildMode(),
  env: {
    [DOCS_SEARCH_BOOTSTRAP_FROM_ENV]: resolveDocsSearchStaticBootstrapFrom(
      process.env,
    ),
  },
  turbopack: {
    root: projectRoot,
  },
};

export default withMDX(nextConfig);
