import { Bebas_Neue, Cormorant_Garamond, Inter } from "next/font/google";

/** Body copy — Inter per docs/site-fundamentals.md */
export const fontBody = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

/** Section and page headings — Cormorant Garamond */
export const fontHeading = Cormorant_Garamond({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

/** Display accents — Bebas Neue */
export const fontDisplay = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const fontVariables = [
  fontBody.variable,
  fontHeading.variable,
  fontDisplay.variable,
].join(" ");
