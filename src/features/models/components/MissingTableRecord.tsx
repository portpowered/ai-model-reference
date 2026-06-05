export function MissingTableRecord({ tableId }: { tableId: string }) {
  return (
    <div data-missing-table-record={tableId} role="status">
      Missing table record: {tableId}
    </div>
  );
}
