import { describe, expect, it } from "bun:test";
import { generateMetadata as generateHomeMetadata } from "@/app/(site)/page";
import { generateMetadata as generateSearchMetadata } from "@/app/(site)/search/page";
import { generateMetadata as generateTagMetadata } from "@/app/(site)/tags/[slug]/page";
import { generateMetadata as generateDocsMetadata } from "@/app/docs/[[...slug]]/page";

describe("localized route metadata alternates", () => {
  it("publishes alternate-language metadata for the home and search surfaces", async () => {
    const homeMetadata = await generateHomeMetadata();
    const searchMetadata = await generateSearchMetadata();

    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.alternates?.languages?.en).toBe("/");
    expect(homeMetadata.alternates?.languages?.vi).toBe("/vi");

    expect(searchMetadata.alternates?.canonical).toBe("/search");
    expect(searchMetadata.alternates?.languages?.en).toBe("/search");
    expect(searchMetadata.alternates?.languages?.vi).toBe("/vi/search");
  });

  it("publishes alternate-language metadata for tag and docs pages", async () => {
    const tagMetadata = await generateTagMetadata({
      params: Promise.resolve({ slug: "attention" }),
    });
    const docsMetadata = await generateDocsMetadata({
      params: Promise.resolve({ slug: ["modules", "grouped-query-attention"] }),
    });

    expect(tagMetadata.alternates?.canonical).toBe("/tags/attention");
    expect(tagMetadata.alternates?.languages?.vi).toBe("/vi/tags/attention");

    expect(docsMetadata.alternates?.canonical).toBe(
      "/docs/modules/grouped-query-attention",
    );
    expect(docsMetadata.alternates?.languages?.vi).toBe(
      "/vi/docs/modules/grouped-query-attention",
    );
  });
});
