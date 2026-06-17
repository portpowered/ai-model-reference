import { describe, expect, test } from "bun:test";
import type { ReactElement } from "react";
import SiteLayout from "@/app/(site)/layout";
import LocalizedLayout from "@/app/[locale]/layout";
import DocsRouteLayout from "@/app/docs/layout";

function expectHtmlElement(element: unknown): ReactElement<{ lang: string }> {
  if (!element || typeof element !== "object" || !("props" in element)) {
    throw new Error("expected layout to return an html element");
  }

  return element as ReactElement<{ lang: string }>;
}

describe("route root layouts set document language on the server", () => {
  test("default site layout returns html with lang=en", async () => {
    const element = expectHtmlElement(
      await SiteLayout({ children: <div>fixture</div> }),
    );

    expect(element.props.lang).toBe("en");
  });

  test("docs layout returns html with lang=en", async () => {
    const element = expectHtmlElement(
      await DocsRouteLayout({ children: <div>fixture</div> }),
    );

    expect(element.props.lang).toBe("en");
  });

  test("localized layout returns html with the active locale", async () => {
    const element = expectHtmlElement(
      await LocalizedLayout({
        children: <div>fixture</div>,
        params: Promise.resolve({ locale: "vi" }),
      }),
    );

    expect(element.props.lang).toBe("vi");
  });
});
