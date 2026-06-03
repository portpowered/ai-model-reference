export type UiMessages = {
  search: {
    open: string;
    placeholder: string;
    close: string;
    noResults: string;
    loading: string;
    shortcut: string;
    resultPath: string;
  };
  nav: {
    home: string;
    search: string;
    architecture: string;
    glossary: string;
    tags: string;
  };
  searchEntry: {
    title: string;
    description: string;
    canonicalNote: string;
    tagFilterDescription: string;
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
    searchPageLinkTitle: string;
    searchPageLinkDescription: string;
    browseSectionTitle: string;
    browseSectionDescription: string;
    architectureLinkTitle: string;
    architectureLinkDescription: string;
    glossaryLinkTitle: string;
    glossaryLinkDescription: string;
    tagsLinkTitle: string;
    tagsLinkDescription: string;
    tokenLinkTitle: string;
    tokenLinkDescription: string;
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
  tagLanding: {
    listLabel: string;
    searchHandoff: string;
    searchEntryLink: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
    emptyTagsLink: string;
  };
  tagCategories: Record<string, string>;
  pageKind: Record<string, string>;
};

export function formatPageKind(messages: UiMessages, kind: string): string {
  return messages.pageKind[kind] ?? kind;
}
