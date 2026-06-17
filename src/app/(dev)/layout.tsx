import type { Metadata } from "next";
import type { ReactNode } from "react";
import { RootDocument, siteMetadata } from "@/app/root-layout.shared";
import "../globals.css";

export const metadata: Metadata = siteMetadata;

export default function DevLayout({ children }: { children: ReactNode }) {
  return <RootDocument lang="en">{children}</RootDocument>;
}
