import { modulePageHref } from "@/lib/content/content-hrefs";
import { lookupMessage } from "@/lib/content/messages";
import type {
  ModuleRecord,
  PageMessages,
  TableRecord,
} from "@/lib/content/schemas";

export type ComparisonTableColumn = {
  moduleId: string;
  title: string;
  href?: string;
};

export type ComparisonTableRow = {
  dimensionId: string;
  label: string;
  cells: Array<{ moduleId: string; value: string }>;
};

export type BuiltModuleComparisonTable = {
  columns: ComparisonTableColumn[];
  rows: ComparisonTableRow[];
};

export function resolveTableMessage(
  messages: PageMessages,
  key: string,
): string {
  const result = lookupMessage(messages, key);
  return result.ok ? result.value : key;
}

function resolveColumnTitle(
  messages: PageMessages,
  moduleId: string,
  titleKey: string | undefined,
  getModule: (id: string) => ModuleRecord | undefined,
): string {
  if (titleKey) {
    const titleResult = lookupMessage(messages, titleKey);
    if (titleResult.ok) {
      return titleResult.value;
    }
  }

  const moduleRecord = getModule(moduleId);
  if (moduleRecord && moduleRecord.aliases.length > 0) {
    return moduleRecord.aliases[0] ?? moduleRecord.slug;
  }

  return moduleId;
}

export function buildModuleComparisonTable(
  table: TableRecord,
  messages: PageMessages,
  getModule: (id: string) => ModuleRecord | undefined,
): BuiltModuleComparisonTable {
  const columns: ComparisonTableColumn[] = table.columns.map((column) => {
    const moduleRecord = getModule(column.moduleId);
    const title = resolveColumnTitle(
      messages,
      column.moduleId,
      column.titleKey,
      getModule,
    );
    const href =
      moduleRecord?.status === "published"
        ? modulePageHref(moduleRecord.slug)
        : undefined;

    return {
      moduleId: column.moduleId,
      title,
      href,
    };
  });

  const rows: ComparisonTableRow[] = table.dimensions.map((dimension) => {
    const label = resolveTableMessage(messages, dimension.labelKey);
    const cells = table.columns.map((column) => {
      const valueKey =
        table.valueKeysByModuleId[column.moduleId]?.[dimension.id];
      const value = valueKey ? resolveTableMessage(messages, valueKey) : "—";

      return {
        moduleId: column.moduleId,
        value,
      };
    });

    return {
      dimensionId: dimension.id,
      label,
      cells,
    };
  });

  return { columns, rows };
}

export function collectTableMessageKeys(table: TableRecord): string[] {
  const keys = new Set<string>();

  for (const dimension of table.dimensions) {
    keys.add(dimension.labelKey);
  }

  for (const column of table.columns) {
    if (column.titleKey) {
      keys.add(column.titleKey);
    }
  }

  for (const valueKeys of Object.values(table.valueKeysByModuleId)) {
    for (const valueKey of Object.values(valueKeys)) {
      keys.add(valueKey);
    }
  }

  return [...keys];
}
