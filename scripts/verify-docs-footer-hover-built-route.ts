import {
  formatPhase1DocsFooterHoverCheckFailure,
  runPhase1DocsFooterHoverChecks,
} from "../src/lib/verify/phase-1-docs-footer-hover-checks";
import {
  acquireVerifyServerSession,
  NEXT_BUILD_REQUIRED_MESSAGE,
} from "../src/lib/verify/server-lifecycle";

async function main(): Promise<number> {
  let session:
    | Awaited<ReturnType<typeof acquireVerifyServerSession>>
    | undefined;

  try {
    session = await acquireVerifyServerSession();
    const failures = await runPhase1DocsFooterHoverChecks(session.baseUrl);

    if (failures.length > 0) {
      console.error(
        "Docs footer hover/focus-visible paint verification failed:",
      );
      for (const failure of failures) {
        console.error(`  ${formatPhase1DocsFooterHoverCheckFailure(failure)}`);
      }
      return 1;
    }

    console.log(
      "Docs footer hover/focus-visible paint verified on production build.",
    );
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === NEXT_BUILD_REQUIRED_MESSAGE) {
        console.error(error.message);
      } else {
        console.error(error.message);
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
