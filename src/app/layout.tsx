import type { ReactNode } from "react";
import "./globals.css";

export const metadata = {
  title: "Model Reference",
  description: "Technical reference for modern AI models and modules",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
