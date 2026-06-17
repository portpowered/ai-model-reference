import type { Metadata } from "next";
import {
  buildTagLandingMetadata,
  generateTagLandingStaticParams,
  renderTagLandingPage,
  type TagLandingPageProps,
} from "../../site-renderers";

export async function generateStaticParams() {
  return generateTagLandingStaticParams();
}

export async function generateMetadata({
  params,
}: TagLandingPageProps): Promise<Metadata> {
  const { slug } = await params;
  return buildTagLandingMetadata(slug);
}

export default async function TagLandingPage(props: TagLandingPageProps) {
  return renderTagLandingPage(props);
}
