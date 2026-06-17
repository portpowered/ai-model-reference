import type { Metadata } from "next";
import { source } from "@/lib/source";
import {
  buildDocsPageMetadata,
  renderDocsSlugPage,
} from "../docs-slug-renderer";

type DocsPageProps = {
  params: Promise<{ slug?: string[] }>;
};

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata({
  params,
}: DocsPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildDocsPageMetadata(slug);
}

export default async function DocsSlugPage({ params }: DocsPageProps) {
  const { slug } = await params;
  return renderDocsSlugPage(slug);
}
