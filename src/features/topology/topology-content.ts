export type TopologyDocsPageContent = {
  href: string;
  summary: string;
  title: string;
};

export type TopologyDocsPageContentByRegistryId = Record<
  string,
  TopologyDocsPageContent
>;
