import { describe, expect, it } from "bun:test";
import { generateMetadata as generateHomeMetadata } from "@/app/(site)/page";
import { generateMetadata as generateSearchMetadata } from "@/app/(site)/search/page";
import { generateMetadata as generateTagMetadata } from "@/app/(site)/tags/[slug]/page";
import { generateStaticParams as generateLocalizedDocsStaticParams } from "@/app/[locale]/docs/[[...slug]]/page";
import { generateMetadata as generateLocalizedArchitectureMetadata } from "@/app/[locale]/docs/architecture/page";
import { generateMetadata as generateLocalizedGlossaryMetadata } from "@/app/[locale]/docs/glossary/page";
import { generateMetadata as generateLocalizedHomeMetadata } from "@/app/[locale]/page";
import { generateMetadata as generateLocalizedSearchMetadata } from "@/app/[locale]/search/page";
import { generateMetadata as generateLocalizedTagsMetadata } from "@/app/[locale]/tags/page";
import { generateMetadata as generateDocsMetadata } from "@/app/docs/[[...slug]]/page";

describe("localized route metadata alternates", () => {
  it("publishes alternate-language metadata for the home and search surfaces", async () => {
    const homeMetadata = await generateHomeMetadata();
    const searchMetadata = await generateSearchMetadata();

    expect(homeMetadata.alternates?.canonical).toBe("/");
    expect(homeMetadata.alternates?.languages?.en).toBe("/");
    expect(homeMetadata.alternates?.languages?.vi).toBe("/vi");
    expect(homeMetadata.alternates?.languages?.ja).toBe("/ja");

    expect(searchMetadata.alternates?.canonical).toBe("/search");
    expect(searchMetadata.alternates?.languages?.en).toBe("/search");
    expect(searchMetadata.alternates?.languages?.vi).toBe("/vi/search");
    expect(searchMetadata.alternates?.languages?.ja).toBe("/ja/search");
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
    expect(tagMetadata.alternates?.languages?.ja).toBe("/ja/tags/attention");

    expect(docsMetadata.alternates?.canonical).toBe(
      "/docs/modules/grouped-query-attention",
    );
    expect(docsMetadata.alternates?.languages?.vi).toBe(
      "/vi/docs/modules/grouped-query-attention",
    );
    expect(docsMetadata.alternates?.languages?.ja).toBe(
      "/ja/docs/modules/grouped-query-attention",
    );
  });

  it("loads localized shell metadata copy from the requested locale", async () => {
    const jaHomeMetadata = await generateLocalizedHomeMetadata({
      params: Promise.resolve({ locale: "ja" }),
    });
    const jaSearchMetadata = await generateLocalizedSearchMetadata({
      params: Promise.resolve({ locale: "ja" }),
    });
    const jaArchitectureMetadata = await generateLocalizedArchitectureMetadata({
      params: Promise.resolve({ locale: "ja" }),
    });
    const jaGlossaryMetadata = await generateLocalizedGlossaryMetadata({
      params: Promise.resolve({ locale: "ja" }),
    });
    const jaTagsMetadata = await generateLocalizedTagsMetadata({
      params: Promise.resolve({ locale: "ja" }),
    });

    expect(jaHomeMetadata.title).toBe("Model Atlas");
    expect(jaHomeMetadata.description).toBe(
      "Model Atlas は、トランスフォーマー、注意機構の派生、学習手法、それらを支えるシステムを扱うドキュメント中心のリファレンスです。",
    );

    expect(jaSearchMetadata.title).toBe("検索");
    expect(jaSearchMetadata.description).toBe(
      "タイトル、別名、タグで Model Atlas を検索します。検索コントロールを使ってモジュール、概念、用語集の項目へ移動できます。",
    );

    expect(jaArchitectureMetadata.title).toBe("アーキテクチャ");
    expect(jaGlossaryMetadata.title).toBe("用語集");
    expect(jaTagsMetadata.title).toBe("タグ");

    expect(jaHomeMetadata.alternates?.canonical).toBe("/");
    expect(jaHomeMetadata.alternates?.languages?.en).toBe("/");
    expect(jaHomeMetadata.alternates?.languages?.vi).toBe("/vi");
    expect(jaHomeMetadata.alternates?.languages?.ja).toBe("/ja");
  });

  it("generates japanese docs routes only for the shipped representative slice", async () => {
    const params = await generateLocalizedDocsStaticParams();

    expect(
      params.some(
        ({ locale, slug }) =>
          locale === "ja" &&
          slug?.join("/") === "modules/grouped-query-attention",
      ),
    ).toBe(true);
    expect(
      params.some(
        ({ locale, slug }) =>
          locale === "ja" && slug?.join("/") === "modules/multi-head-attention",
      ),
    ).toBe(true);
    expect(
      params.some(
        ({ locale, slug }) =>
          locale === "ja" &&
          slug?.join("/") === "modules/multi-query-attention",
      ),
    ).toBe(true);
    expect(
      params.some(
        ({ locale, slug }) =>
          locale === "ja" && slug?.join("/") === "modules/linear-attention",
      ),
    ).toBe(true);
    expect(
      params.some(
        ({ locale, slug }) =>
          locale === "ja" &&
          slug?.join("/") === "modules/sliding-window-attention",
      ),
    ).toBe(true);
    expect(
      params.some(
        ({ locale, slug }) =>
          locale === "vi" &&
          slug?.join("/") === "modules/grouped-query-attention",
      ),
    ).toBe(true);
  });
});
