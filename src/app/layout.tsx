import type { Metadata } from "next";
import Script from "next/script";
import type { ReactNode } from "react";
import "./globals.css";

export const metadata: Metadata = {
  title: "Model Atlas",
  description: "Reference for modern AI models and modules",
};

export default async function RootLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <head>
        <Script id="route-locale-lang" strategy="beforeInteractive">
          {`document.documentElement.lang = window.location.pathname.startsWith('/vi') ? 'vi' : 'en';`}
        </Script>
      </head>
      <body>{children}</body>
    </html>
  );
}
