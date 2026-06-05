"use client";

import { MissingMessageKey } from "@/features/docs/components/MissingMessageKey";
import { ProseAutoLinkText } from "@/features/docs/components/ProseAutoLinkText";
import { usePageMessages } from "@/features/docs/components/page-messages-context";
import { MissingTableRecord } from "@/features/models/components/MissingTableRecord";
import { lookupMessage } from "@/lib/content/messages";
import {
  buildModuleComparisonTable,
  collectTableMessageKeys,
} from "@/lib/content/module-comparison-table";
import { getModuleById } from "@/lib/content/registry-runtime";
import { getTableById } from "@/lib/content/table-registry-runtime";

export function RegistryComparisonTable({
  assetId,
  tableId,
  caption,
  isDev = false,
}: {
  assetId: string;
  tableId: string;
  caption?: string;
  isDev?: boolean;
}) {
  const { messages } = usePageMessages();
  const tableRecord = getTableById(tableId);

  if (!tableRecord) {
    return <MissingTableRecord tableId={tableId} />;
  }

  const { columns, rows } = buildModuleComparisonTable(
    tableRecord,
    messages,
    getModuleById,
  );

  if (isDev) {
    for (const key of collectTableMessageKeys(tableRecord)) {
      const result = lookupMessage(messages, key);
      if (!result.ok) {
        return <MissingMessageKey messageKey={key} reason={result.reason} />;
      }
    }
  }

  return (
    <figure
      className="registry-comparison-table-figure"
      data-page-asset={assetId}
      data-asset-type="table"
      data-table-id={tableId}
      data-registry-comparison-table="true"
    >
      <div className="registry-comparison-table__scroll overflow-x-auto">
        <table className="registry-comparison-table w-full min-w-[28rem] border-collapse text-sm">
          <thead>
            <tr>
              <th
                scope="col"
                className="border-border border px-3 py-2 text-left font-medium"
              >
                <span className="sr-only">Comparison dimension</span>
              </th>
              {columns.map((column) => (
                <th
                  key={column.moduleId}
                  scope="col"
                  className="border-border border px-3 py-2 text-left font-medium"
                  data-comparison-column={column.moduleId}
                >
                  {column.href ? (
                    <a
                      href={column.href}
                      className="text-primary underline-offset-4 hover:underline"
                    >
                      {column.title}
                    </a>
                  ) : (
                    column.title
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.dimensionId}
                data-comparison-dimension={row.dimensionId}
              >
                <th
                  scope="row"
                  className="border-border border px-3 py-2 text-left font-medium"
                >
                  {row.label}
                </th>
                {row.cells.map((cell) => (
                  <td
                    key={`${row.dimensionId}:${cell.moduleId}`}
                    className="border-border border px-3 py-2 align-top"
                    data-comparison-cell={`${row.dimensionId}:${cell.moduleId}`}
                  >
                    <ProseAutoLinkText text={cell.value} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {caption ? <figcaption>{caption}</figcaption> : null}
    </figure>
  );
}
