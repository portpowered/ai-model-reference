/** Search dialog copy used by the generic documentation shell. */
export type SearchMessages = {
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

/** Primary navigation labels for the generic documentation shell. */
export type NavMessages = {
  home: string;
  search: string;
  menu: string;
  architecture: string;
  topology: string;
  glossary: string;
  timeline: string;
  tags: string;
};

/** Language selector copy for the generic documentation shell. */
export type LanguageMessages = {
  open: string;
  selectorLabel: string;
  unavailable: string;
  locales: Record<string, string>;
};

/** Sidebar and layout chrome copy for the generic documentation shell. */
export type ShellLayoutMessages = {
  sidebarTitle: string;
  sidebarDescription: string;
  onThisPage: string;
  openingSummary: string;
};

/**
 * Shell-level UI messages: search, navigation, language selector, and layout chrome.
 * Reusable across generic documentation shells without AI domain topology/timeline copy.
 */
export type ShellMessages = {
  search: SearchMessages;
  nav: NavMessages;
  language: LanguageMessages;
  shell: ShellLayoutMessages;
};

/** Shared section-index copy shape for docs collection landing pages. */
export type SectionIndexMessages = {
  title: string;
  description: string;
  listLabel: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyHomeLink: string;
};

/** Docs home page copy. */
export type HomeMessages = {
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

/** Browse hub and quick-route copy for the docs index. */
export type BrowseIndexMessages = {
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

/** Dedicated search entry page copy within the docs surface. */
export type SearchEntryMessages = {
  title: string;
  description: string;
  canonicalNote: string;
  tagFilterDescription: string;
  classificationScopeDescription: string;
  emptySuggestionGqa: string;
  emptySuggestionAttentionLinkLabel: string;
  emptySuggestionPrefix: string;
  emptySuggestionMiddle: string;
  emptySuggestionSuffix: string;
};

/** Tags index and tag landing copy for docs navigation surfaces. */
export type TagsIndexMessages = {
  title: string;
  description: string;
  listLabel: string;
};

export type TagLandingMessages = {
  listLabel: string;
  searchHandoff: string;
  searchEntryLink: string;
  emptyTitle: string;
  emptyDescription: string;
  emptyHomeLink: string;
  emptyTagsLink: string;
};

/**
 * Generic docs UI messages: home, browse/index hubs, section indexes,
 * architecture/glossary/tags surfaces, and page-kind labels.
 */
export type DocsMessages = {
  searchEntry: SearchEntryMessages;
  home: HomeMessages;
  browseIndex: BrowseIndexMessages;
  modelsIndex: SectionIndexMessages;
  modulesIndex: SectionIndexMessages;
  conceptsIndex: SectionIndexMessages;
  papersIndex: SectionIndexMessages;
  trainingIndex: SectionIndexMessages;
  systemsIndex: SectionIndexMessages;
  glossaryIndex: SectionIndexMessages;
  architectureIndex: SectionIndexMessages;
  tagsIndex: TagsIndexMessages;
  tagLanding: TagLandingMessages;
  tagCategories: Record<string, string>;
  pageKind: Record<string, string>;
};

/** Compatibility surface: full shipped UI messages for current consumers. */
export type UiMessages = ShellMessages &
  DocsMessages & {
    timelinePage: {
      title: string;
      description: string;
      eyebrow: string;
      successSummary: string;
      loadingTitle: string;
      loadingDescription: string;
      errorTitle: string;
      errorDescription: string;
      selectorLabel: string;
      eventCountLabel: string;
      regionLabel: string;
      docsLink: string;
      sourcePrefix: string;
      emptyTitle: string;
      emptyDescription: string;
      activationLink: string;
    };
    topologyBrowse: {
      titleTemplate: string;
      descriptionTemplate: string;
      navigationLabelTemplate: string;
      graphMapLabel: string;
      timelineLabel: string;
      classificationLabels: {
        activationFunctions: string;
        attentionMechanisms: string;
        feedForwardNetworks: string;
        normalizationLayers: string;
        positionEncodingMethods: string;
        tokenizationMethods: string;
        transformerBlockStructures: string;
      };
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
      classificationChildrenLabel: string;
      recordChildrenLabel: string;
      directMembersLabel: string;
      totalMembersLabel: string;
    };
    topologyPrototype: {
      title: string;
      description: string;
      selectedViewLabel: string;
      selectedViewValue: string;
      selectedViewDefault: string;
      selectedViewNone: string;
      chipListLabel: string;
      chipHint: string;
      clearSelectionLabel: string;
      loadingTitle: string;
      loadingDescription: string;
      emptyTitle: string;
      emptyDescription: string;
      emptySelectedPrefix: string;
      emptyNoSelectionDescription: string;
      emptyReturnAction: string;
      errorTitle: string;
      errorDescription: string;
      errorInvalidPrefix: string;
      errorReturnAction: string;
      successTitle: string;
      successDescription: string;
      graphLabel: string;
      fitGraphLabel: string;
      resetGraphLabel: string;
      legendTitle: string;
      membershipLegendDescription: string;
      relationshipLegendDescription: string;
      accessibleNodeListTitle: string;
      accessibleRelationshipListTitle: string;
      classificationNodeLabel: string;
      recordNodeLabel: string;
      classificationTypeDomain: string;
      classificationTypeFamily: string;
      classificationTypeTopology: string;
      detailPanelTitle: string;
      detailPanelHint: string;
      detailPanelDismissLabel: string;
      detailPanelEmptyTitle: string;
      detailPanelEmptyDescription: string;
      detailLabelSummary: string;
      detailLabelPrimaryClassification: string;
      detailLabelSecondaryClassifications: string;
      detailLabelCanonicalPage: string;
      detailLabelScope: string;
      detailLabelAppliesTo: string;
      detailLabelVisibleMembers: string;
      detailLabelRelationship: string;
      detailLabelSource: string;
      detailLabelTarget: string;
      detailNoSecondaryClassifications: string;
      detailMissingSummary: string;
      detailOpenCanonicalPage: string;
      activationChip: string;
      activationFunctionChip: string;
      feedForwardChip: string;
      nodeActivation: string;
      nodeRelu: string;
      nodeSilu: string;
      nodeSwiGLU: string;
      nodeFeedForward: string;
    };
  };

export function formatPageKind(messages: UiMessages, kind: string): string {
  return messages.pageKind[kind] ?? kind;
}
