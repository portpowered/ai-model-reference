export function MissingGraphRecord({ graphId }: { graphId: string }) {
  return (
    <span
      data-missing-graph-id={graphId}
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
      {`Missing graph record: ${graphId}`}
    </span>
  );
}
