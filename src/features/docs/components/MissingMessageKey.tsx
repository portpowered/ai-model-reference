import {
  formatMissingMessageKey,
  type MissingMessageReason,
} from "@/lib/content/messages";

export function MissingMessageKey({
  messageKey,
  reason = "missing",
}: {
  messageKey: string;
  reason?: MissingMessageReason;
}) {
  return (
    <span
      data-missing-message-key={messageKey}
      role="alert"
      style={{
        display: "inline-block",
        padding: "0.125rem 0.375rem",
        border: "1px solid var(--destructive, #c53030)",
        borderRadius: "0.25rem",
        color: "var(--destructive-foreground, #fff)",
        background: "var(--destructive, #c53030)",
        fontFamily: "monospace",
        fontSize: "0.875rem",
      }}
    >
      {formatMissingMessageKey(messageKey, reason)}
    </span>
  );
}
