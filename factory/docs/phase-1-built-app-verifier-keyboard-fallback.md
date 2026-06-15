# Phase 1 built-app verifier — keyboard shortcut fallback

The built-app manual gate verifier (`make verify-phase-1-ux`) automates
**Meta+K** and **Control+K** on the home page via Playwright. Each shortcut
must open the header search dialog with a visible search textbox.

When CI or a review workstation cannot reliably dispatch OS keyboard shortcuts,
set `VERIFY_SEARCH_SHORTCUT_SKIP=1` before running the verifier. Automated
shortcut checks are skipped; the verifier still runs route, API, `/search`, and
header-dialog query checks.

## Required manual check when skipping shortcuts

After a successful automated run with `VERIFY_SEARCH_SHORTCUT_SKIP=1`, reviewers
must confirm keyboard search entry manually:

1. Open the production-built app home page (`/`).
2. Press **Cmd+K** (macOS) or **Ctrl+K** (Windows/Linux) and confirm the
   header search dialog opens with a visible search textbox.

Record pass/fail in convergence review notes alongside the verifier exit code.
