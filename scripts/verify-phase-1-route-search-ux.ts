import {
  PHASE_1_UX_SUCCESS_MESSAGE,
  runPhase1CustomerAskConvergenceVerification,
} from "../src/lib/verify/customer-ask-convergence-orchestrator";
import { resolveCustomerAskSearchSurfaceCheckOptionsFromEnv } from "../src/lib/verify/customer-ask-search-surface-convergence-http";
import { resolveSearchDialogCheckOptionsFromEnv } from "../src/lib/verify/phase-1-search-dialog-checks";
import { resolveSearchPageCheckOptionsFromEnv } from "../src/lib/verify/phase-1-search-page-checks";
import { resolveSearchShortcutCheckOptionsFromEnv } from "../src/lib/verify/phase-1-search-shortcut-checks";
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
    const result = await runPhase1CustomerAskConvergenceVerification(
      session.baseUrl,
      {
        phase1UxOptions: {
          searchPageOptions: resolveSearchPageCheckOptionsFromEnv(),
          searchDialogOptions: resolveSearchDialogCheckOptionsFromEnv(),
          searchShortcutOptions: resolveSearchShortcutCheckOptionsFromEnv(),
        },
        customerAskOptions: {
          searchSurfaceOptions:
            resolveCustomerAskSearchSurfaceCheckOptionsFromEnv(),
        },
      },
    );

    if (result.phase1UxPassed && result.customerAskExitCode === 0) {
      console.log(PHASE_1_UX_SUCCESS_MESSAGE);
      return 0;
    }

    return 1;
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === NEXT_BUILD_REQUIRED_MESSAGE) {
        console.error(error.message);
      } else if (
        !error.message.includes(
          "Phase 1 docs shell convergence verification failed",
        ) &&
        !error.message.includes(
          "Phase 1 home search entry convergence verification failed",
        ) &&
        !error.message.includes(
          "Phase 1 reader route content convergence verification failed",
        ) &&
        !error.message.includes(
          "Phase 1 tags navigation convergence verification failed",
        ) &&
        !error.message.includes("Phase 1 route verification failed") &&
        !error.message.includes("Phase 1 search verification failed") &&
        !error.message.includes("Phase 1 /search page verification failed") &&
        !error.message.includes(
          "Phase 1 header search dialog verification failed",
        ) &&
        !error.message.includes(
          "Phase 1 search keyboard shortcut verification failed",
        )
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
