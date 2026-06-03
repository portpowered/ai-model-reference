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
  shell: {
    sidebarTitle: string;
    sidebarDescription: string;
    onThisPage: string;
  };
  home: {
    title: string;
    subtitle: string;
    intro: string;
    searchSectionTitle: string;
    searchSectionDescription: string;
    browseSectionTitle: string;
    browseSectionDescription: string;
    architectureLinkTitle: string;
    architectureLinkDescription: string;
    glossaryLinkTitle: string;
    glossaryLinkDescription: string;
    tagsLinkTitle: string;
    tagsLinkDescription: string;
    docsLinkTitle: string;
    docsLinkDescription: string;
    onThisPageSearch: string;
    onThisPageBrowse: string;
  };
  glossaryIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  architectureIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  tagsIndex: {
    title: string;
    description: string;
    listLabel: string;
  };
  tagCategories: Record<string, string>;
  pageKind: Record<string, string>;
};

export function formatPageKind(messages: UiMessages, kind: string): string {
  return messages.pageKind[kind] ?? kind;
}
