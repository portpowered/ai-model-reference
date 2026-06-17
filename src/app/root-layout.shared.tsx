import type { Metadata } from "next";
import type { ReactNode } from "react";

export const siteMetadata: Metadata = {
  title: "Model Atlas",
  description: "Reference for modern AI models and modules",
};

type RootDocumentProps = {
  children: ReactNode;
  lang: string;
};

export function RootDocument({ children, lang }: RootDocumentProps) {
  return (
    <html lang={lang} className="dark" suppressHydrationWarning>
      <body>{children}</body>
    </html>
  );
}
