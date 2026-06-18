import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { loadUiMessages } from "@/lib/content/ui-messages";
import {
  loadUiMessagesFromDisk,
  UiMessagesLoadError,
} from "@/lib/content/ui-messages-load";

describe("loadUiMessages shell keys", () => {
  const tempMessagesRoot = join(
    import.meta.dir,
    "__fixtures__",
    `ui-messages-${crypto.randomUUID()}`,
  );

  afterEach(async () => {
    await rm(tempMessagesRoot, { recursive: true, force: true });
  });

  it("loads shell copy for the docs layout", async () => {
    const messages = await loadUiMessages();
    expect(messages.shell.sidebarTitle.length).toBeGreaterThan(0);
    expect(messages.nav.home).toBe("Home");
    expect(messages.nav.search).toBe("Search");
    expect(messages.nav.menu).toBe("Open menu");
    expect(messages.nav.architecture).toBe("Architecture");
    expect(messages.nav.language).toBe("Language");
    expect(messages.nav.currentLanguage).toBe("Current");
    expect(messages.searchEntry.title).toBe("Search");
    expect(messages.architectureIndex.title).toBe("Architecture");
    expect(messages.glossaryIndex.title).toBe("Glossary");
    expect(messages.tagsIndex.title).toBe("Tags");
  });

  it("loads shipped vietnamese shell copy when vi shared messages are available", async () => {
    const messages = await loadUiMessages("vi");
    expect(messages.nav.home).toBe("Trang chủ");
    expect(messages.nav.language).toBe("Ngôn ngữ");
    expect(messages.searchEntry.title).toBe("Tìm kiếm");
    expect(messages.tagsIndex.title).toBe("Thẻ");
  });

  it("loads shipped japanese shell copy when ja shared messages are available", async () => {
    const messages = await loadUiMessages("ja");
    expect(messages.nav.home).toBe("ホーム");
    expect(messages.nav.language).toBe("言語");
    expect(messages.searchEntry.title).toBe("検索");
    expect(messages.tagsIndex.title).toBe("タグ");
    expect(messages.shell.sidebarTitle).toBe("リファレンス");
  });

  it("fails closed when shipped vietnamese shared UI messages are missing", async () => {
    await mkdir(join(tempMessagesRoot, "en"), { recursive: true });
    await writeFile(
      join(tempMessagesRoot, "en", "common.json"),
      JSON.stringify({
        nav: { home: "Home" },
      }),
    );

    expect(() =>
      loadUiMessagesFromDisk("vi", { messagesRoot: tempMessagesRoot }),
    ).toThrow(UiMessagesLoadError);
    expect(() =>
      loadUiMessagesFromDisk("vi", { messagesRoot: tempMessagesRoot }),
    ).toThrow(/Missing required UI messages file for locale "vi"/);
  });

  it("fails closed when shipped japanese shared UI messages are missing", async () => {
    await mkdir(join(tempMessagesRoot, "en"), { recursive: true });
    await writeFile(
      join(tempMessagesRoot, "en", "common.json"),
      JSON.stringify({
        nav: { home: "Home" },
      }),
    );

    expect(() =>
      loadUiMessagesFromDisk("ja", { messagesRoot: tempMessagesRoot }),
    ).toThrow(UiMessagesLoadError);
    expect(() =>
      loadUiMessagesFromDisk("ja", { messagesRoot: tempMessagesRoot }),
    ).toThrow(/Missing required UI messages file for locale "ja"/);
  });
});
