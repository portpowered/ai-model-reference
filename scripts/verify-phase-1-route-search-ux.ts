import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  runPhase1UxVerification,
} from "../src/lib/verify/phase-1-ux-verifier";
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
    await runPhase1UxVerification(session.baseUrl);
    console.log(PHASE_1_UX_SUCCESS_MESSAGE);
    return 0;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === NEXT_BUILD_REQUIRED_MESSAGE) {
        console.error(error.message);
      } else if (
        !error.message.includes("Phase 1 route verification failed") &&
        !error.message.includes("Phase 1 search verification failed")
      ) {
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
