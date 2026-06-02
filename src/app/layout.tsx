import { RootProvider } from "fumadocs-ui/provider/next";
import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { fontBody, fontVariables } from "@/lib/fonts";

import "./globals.css";

export const metadata: Metadata = {
  title: "Model Reference",
  description:
    "A documentation-native reference for modern AI models, modules, and concepts.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${fontVariables}`}>
      <body
        className={`${fontBody.className} min-h-screen bg-background text-foreground antialiased`}
      >
        <RootProvider>{children}</RootProvider>
      </body>
    </html>
  );
}
