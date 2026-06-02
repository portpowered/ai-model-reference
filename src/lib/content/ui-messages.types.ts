export type UiMessages = {
  search: {
    open: string;
    placeholder: string;
    close: string;
    noResults: string;
    loading: string;
    shortcut: string;
  };
  nav: {
    home: string;
    glossary: string;
    tags: string;
    docs: string;
  };
  pageKind: Record<string, string>;
};

export function formatPageKind(messages: UiMessages, kind: string): string {
  return messages.pageKind[kind] ?? kind;
}
