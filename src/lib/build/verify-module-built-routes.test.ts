import { describe, expect, test } from "bun:test";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  verifyGroupedQueryAttentionBuiltRouteFromFile,
  verifyGroupedQueryAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-grouped-query-attention-built-route";
import {
  verifyLinearAttentionBuiltRouteFromFile,
  verifyLinearAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-linear-attention-built-route";
import {
  verifyMultiHeadLatentAttentionBuiltRouteFromFile,
  verifyMultiHeadLatentAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-multi-head-latent-attention-built-route";
import {
  verifySlidingWindowAttentionBuiltRouteFromFile,
  verifySlidingWindowAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-sliding-window-attention-built-route";
import {
  verifySparseAttentionBuiltRouteFromFile,
  verifySparseAttentionBuiltRouteFromHtml,
} from "@/lib/build/verify-sparse-attention-built-route";
import { buildGroupedQueryAttentionStubBody } from "@/lib/verify/grouped-query-attention-module-convergence";
import { buildLinearAttentionStubBody } from "@/lib/verify/linear-attention-module-convergence";
import { buildMultiHeadLatentAttentionStubBody } from "@/lib/verify/multi-head-latent-attention-module-convergence";
import { buildSlidingWindowAttentionStubBody } from "@/lib/verify/sliding-window-attention-module-convergence";
import { buildSparseAttentionStubBody } from "@/lib/verify/sparse-attention-module-convergence";

type VerificationResult = { ok: true } | { ok: false; reason: string };

type ModuleBuiltRouteCase = {
  label: string;
  slug: string;
  invalidTitle: string;
  tempPrefix: string;
  buildStubBody: () => string;
  verifyHtml: (html: string) => VerificationResult;
  verifyFile: (path: string, cwd?: string) => VerificationResult;
};

const moduleBuiltRouteCases: ModuleBuiltRouteCase[] = [
  {
    label: "grouped-query attention",
    slug: "grouped-query-attention",
    invalidTitle: "Grouped-Query Attention",
    tempPrefix: "gqa-built-route-",
    buildStubBody: buildGroupedQueryAttentionStubBody,
    verifyHtml: verifyGroupedQueryAttentionBuiltRouteFromHtml,
    verifyFile: verifyGroupedQueryAttentionBuiltRouteFromFile,
  },
  {
    label: "linear attention",
    slug: "linear-attention",
    invalidTitle: "Linear Attention",
    tempPrefix: "linear-built-route-",
    buildStubBody: buildLinearAttentionStubBody,
    verifyHtml: verifyLinearAttentionBuiltRouteFromHtml,
    verifyFile: verifyLinearAttentionBuiltRouteFromFile,
  },
  {
    label: "multi-head latent attention",
    slug: "multi-head-latent-attention",
    invalidTitle: "Multi-Head Latent Attention",
    tempPrefix: "mla-built-route-",
    buildStubBody: buildMultiHeadLatentAttentionStubBody,
    verifyHtml: verifyMultiHeadLatentAttentionBuiltRouteFromHtml,
    verifyFile: verifyMultiHeadLatentAttentionBuiltRouteFromFile,
  },
  {
    label: "sliding-window attention",
    slug: "sliding-window-attention",
    invalidTitle: "Sliding-Window Attention",
    tempPrefix: "sliding-window-built-route-",
    buildStubBody: buildSlidingWindowAttentionStubBody,
    verifyHtml: verifySlidingWindowAttentionBuiltRouteFromHtml,
    verifyFile: verifySlidingWindowAttentionBuiltRouteFromFile,
  },
  {
    label: "sparse attention",
    slug: "sparse-attention",
    invalidTitle: "Sparse Attention",
    tempPrefix: "sparse-built-route-",
    buildStubBody: buildSparseAttentionStubBody,
    verifyHtml: verifySparseAttentionBuiltRouteFromHtml,
    verifyFile: verifySparseAttentionBuiltRouteFromFile,
  },
];

describe("module built route verifiers", () => {
  test.each(
    moduleBuiltRouteCases,
  )("$label passes when HTML includes module markers", ({
    buildStubBody,
    verifyHtml,
  }) => {
    const result = verifyHtml(`<html><body>${buildStubBody()}</body></html>`);
    expect(result.ok).toBe(true);
  });

  test.each(
    moduleBuiltRouteCases,
  )("$label fails when a required marker is missing", ({
    invalidTitle,
    verifyHtml,
  }) => {
    const result = verifyHtml(`<html><body>${invalidTitle}</body></html>`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("missing expected content");
    }
  });

  test.each(
    moduleBuiltRouteCases,
  )("$label file verifier fails when built HTML is missing", ({
    slug,
    verifyFile,
  }) => {
    const result = verifyFile(`.next/missing/${slug}.html`);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.reason).toContain("Missing built HTML");
    }
  });

  test.each(
    moduleBuiltRouteCases,
  )("$label file verifier passes against fixture HTML on disk", ({
    buildStubBody,
    slug,
    tempPrefix,
    verifyFile,
  }) => {
    const dir = mkdtempSync(join(tmpdir(), tempPrefix));
    try {
      const htmlPath = join(dir, `${slug}.html`);
      writeFileSync(htmlPath, `<html><body>${buildStubBody()}</body></html>`);

      const result = verifyFile(htmlPath, dir);
      expect(result.ok).toBe(true);
    } finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
