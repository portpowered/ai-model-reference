import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { runRenderedQualityBaselineAudit } from "../src/lib/verify/rendered-quality-baseline-playwright";
import {
  formatRenderedQualityAuditReport,
  printRenderedQualityAuditReport,
} from "../src/lib/verify/rendered-quality-baseline-report";
import {
  acquireVerifyServerSession,
  NEXT_BUILD_REQUIRED_MESSAGE,
} from "../src/lib/verify/server-lifecycle";

const projectRoot = join(import.meta.dir, "..");
const auditReportPath = join(
  projectRoot,
  "docs/temp/rendered-quality-baseline-audit.md",
);

async function main(): Promise<number> {
  let session:
    | Awaited<ReturnType<typeof acquireVerifyServerSession>>
    | undefined;

  try {
    session = await acquireVerifyServerSession({ projectRoot });
    const result = await runRenderedQualityBaselineAudit(session.baseUrl);
    const report = formatRenderedQualityAuditReport(result);
    writeFileSync(auditReportPath, `${report}\n`, "utf8");

    printRenderedQualityAuditReport(result);
    console.log("");
    console.log(
      `Rendered quality baseline report written to ${auditReportPath}`,
    );
    console.log(`Issues recorded: ${result.issues.length}`);
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === NEXT_BUILD_REQUIRED_MESSAGE) {
        console.error(error.message);
      } else {
        console.error(
          error.message || "Rendered quality baseline audit failed.",
        );
      }
    } else {
      console.error(String(error));
    }
    return 1;
  } finally {
    if (session) {
      await session.cleanup();
    }
  }
}

const exitCode = await main();
process.exit(exitCode);
