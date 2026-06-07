export const STATIC_SERVER_COMMAND_PATH_DOMAIN_ID =
  "static-server-command-path" as const;

export const STATIC_SERVER_COMMAND_PATH_DOMAIN_LABEL =
  "Static export file server command path (serve out/)";

export const STATIC_SERVER_COMMAND_PATH_CHECKLIST_ROW =
  "phase-1-github-pages-static-server-command-path";

export type StaticServerCommandPathStatus = "pass" | "fail" | "uncertain";

export type StaticServerCommandPathEvidence = {
  domainId: typeof STATIC_SERVER_COMMAND_PATH_DOMAIN_ID;
  label: string;
  checklistRow: string;
  status: StaticServerCommandPathStatus;
  reason?: string;
};

export type DeriveStaticServerCommandPathEvidenceInput = {
  skipped?: boolean;
  skipReason?: string;
  lifecycleStatus?: "pass" | "fail";
  lifecycleReason?: string;
};

function buildEvidence(
  status: StaticServerCommandPathStatus,
  reason?: string,
): StaticServerCommandPathEvidence {
  return {
    domainId: STATIC_SERVER_COMMAND_PATH_DOMAIN_ID,
    label: STATIC_SERVER_COMMAND_PATH_DOMAIN_LABEL,
    checklistRow: STATIC_SERVER_COMMAND_PATH_CHECKLIST_ROW,
    status,
    reason,
  };
}

/**
 * Derives static-server-command-path pass/fail/uncertain evidence from the
 * static export server lifecycle outcome or an upstream skip reason.
 */
export function deriveStaticServerCommandPathEvidence(
  input: DeriveStaticServerCommandPathEvidenceInput,
): StaticServerCommandPathEvidence {
  if (input.skipped) {
    return buildEvidence(
      "uncertain",
      input.skipReason ??
        "Static export server verification skipped because an upstream workflow stage did not complete.",
    );
  }

  if (input.lifecycleStatus === "fail") {
    return buildEvidence(
      "fail",
      input.lifecycleReason ??
        "Static export file server lifecycle failed before readiness.",
    );
  }

  if (input.lifecycleStatus === "pass") {
    return buildEvidence("pass");
  }

  return buildEvidence(
    "uncertain",
    "Static export server lifecycle outcome was not recorded.",
  );
}

export function formatStaticServerCommandPathEvidenceLine(
  evidence: StaticServerCommandPathEvidence,
): string {
  const status = evidence.status.toUpperCase();
  const reason =
    evidence.status !== "pass" && evidence.reason
      ? ` — ${evidence.reason}`
      : "";
  return `[${status}] ${evidence.domainId} — ${evidence.label}${reason} — checklistRow=${evidence.checklistRow}`;
}
