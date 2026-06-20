export type UiMessages = {
  search: {
    open: string;
    placeholder: string;
    close: string;
    idle: string;
    noResults: string;
    loading: string;
    error: string;
    retry: string;
    shortcut: string;
    resultPath: string;
  };
  nav: {
    home: string;
    search: string;
    menu: string;
    architecture: string;
    glossary: string;
    tags: string;
  };
  language: {
    open: string;
    selectorLabel: string;
    unavailable: string;
    locales: Record<string, string>;
  };
  searchEntry: {
    title: string;
    description: string;
    canonicalNote: string;
    tagFilterDescription: string;
    emptySuggestionGqa: string;
    emptySuggestionAttentionLinkLabel: string;
    emptySuggestionPrefix: string;
    emptySuggestionMiddle: string;
    emptySuggestionSuffix: string;
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
    browseSectionTitle: string;
    atlasLinkTitle: string;
    atlasLinkDescription: string;
    gqaLinkTitle: string;
    gqaLinkDescription: string;
    swigluLinkTitle: string;
    swigluLinkDescription: string;
    reluLinkTitle: string;
    reluLinkDescription: string;
    onThisPageBrowse: string;
  };
  browseIndex: {
    title: string;
    description: string;
    quickRoutesTitle: string;
    quickRoutesDescription: string;
    searchRouteDescription: string;
    glossaryRouteDescription: string;
    architectureRouteDescription: string;
    tagsRouteDescription: string;
    modelsSectionTitle: string;
    modelsSectionDescription: string;
    modelsSectionLinkLabel: string;
    modulesSectionTitle: string;
    modulesSectionDescription: string;
    modulesSectionLinkLabel: string;
    conceptsSectionTitle: string;
    conceptsSectionDescription: string;
    conceptsSectionLinkLabel: string;
    papersSectionTitle: string;
    papersSectionDescription: string;
    papersSectionLinkLabel: string;
    trainingSectionTitle: string;
    trainingSectionDescription: string;
    trainingSectionLinkLabel: string;
    systemsSectionTitle: string;
    systemsSectionDescription: string;
    systemsSectionLinkLabel: string;
    glossarySectionTitle: string;
    glossarySectionDescription: string;
    glossarySectionLinkLabel: string;
  };
  topologyBrowse: {
    titleTemplate: string;
    descriptionTemplate: string;
    graphMapLabel: string;
    timelineLabel: string;
    classificationSelectorTitle: string;
    classificationSelectorDescription: string;
    classificationSelectorLabel: string;
    selectedClassificationLabel: string;
    selectedModeLabel: string;
    membersTitle: string;
    graphMapDescription: string;
    timelineDescription: string;
    invalidTitle: string;
    invalidDescription: string;
    invalidClassificationLabel: string;
    invalidModeLabel: string;
    missingValue: string;
    emptyTitle: string;
    emptyDescription: string;
    validOptionsTitle: string;
    memberListLabel: string;
  };
  modelsIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  modulesIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  conceptsIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  papersIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  trainingIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
  };
  systemsIndex: {
    title: string;
    description: string;
    listLabel: string;
    emptyTitle: string;
    emptyDescription: string;
    emptyHomeLink: string;
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
