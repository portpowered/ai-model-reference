import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  formatPageKind,
  loadUiMessages,
  UI_MESSAGES_COMPATIBILITY_KEYS,
} from "@/lib/content/ui-messages";
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
    expect(messages.shell.openingSummary).toBe("Opening summary");
    expect(messages.nav.home).toBe("Home");
    expect(messages.nav.search).toBe("Search");
    expect(messages.nav.menu).toBe("Open menu");
    expect(messages.nav.architecture).toBe("Architecture");
    expect(
      messages.topologyBrowse.classificationLabels.activationFunctions,
    ).toBe("Activation Functions");
    expect(
      messages.topologyBrowse.classificationLabels.attentionMechanisms,
    ).toBe("Attention Mechanisms");
    expect(messages.searchEntry.title).toBe("Search");
    expect(messages.browseIndex.title).toBe("Browse the Atlas");
    expect(messages.modelsIndex.title).toBe("Models");
    expect(messages.modulesIndex.title).toBe("Modules");
    expect(messages.conceptsIndex.title).toBe("Concepts");
    expect(messages.architectureIndex.title).toBe("Architecture");
    expect(messages.glossaryIndex.title).toBe("Glossary");
    expect(messages.tagsIndex.title).toBe("Tags");
  });

  it("loads shipped vietnamese shell copy when vi shared messages are available", async () => {
    const messages = await loadUiMessages("vi");
    expect(messages.nav.home).toBe("Trang chủ");
    expect(messages.browseIndex.title).toBe("Duyệt Atlas");
    expect(messages.modelsIndex.title).toBe("Mô hình");
    expect(messages.searchEntry.title).toBe("Tìm kiếm");
    expect(messages.tagsIndex.title).toBe("Thẻ");
    expect(messages.topologyBrowse.navigationLabelTemplate).toBe(
      "{mode} {classification}",
    );
    expect(
      messages.topologyBrowse.classificationLabels.transformerBlockStructures,
    ).toBe("Cấu trúc khối transformer");
    expect(messages.shell.openingSummary).toBe("Tóm tắt mở đầu");
  });

  it("loads shipped japanese shell copy when ja shared messages are available", async () => {
    const messages = await loadUiMessages("ja");
    expect(messages.nav.home).toBe("ホーム");
    expect(messages.browseIndex.title).toBe("アトラスを参照");
    expect(messages.modelsIndex.title).toBe("モデル");
    expect(messages.searchEntry.title).toBe("検索");
    expect(messages.tagsIndex.title).toBe("タグ");
    expect(messages.shell.sidebarTitle).toBe("リファレンス");
    expect(
      messages.topologyBrowse.classificationLabels.feedForwardNetworks,
    ).toBe("フィードフォワードネットワーク");
    expect(
      messages.topologyBrowse.classificationLabels.normalizationLayers,
    ).toBe("正規化層");
    expect(messages.shell.openingSummary).toBe("要約を開く");
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

  it("exposes every compatibility top-level message group", async () => {
    const messages = await loadUiMessages();
    for (const key of UI_MESSAGES_COMPATIBILITY_KEYS) {
      expect(messages[key]).toBeDefined();
    }
  });

  it("formatPageKind resolves known kinds and falls back for unknown kinds", async () => {
    const messages = await loadUiMessages();
    expect(formatPageKind(messages, "module")).toBe("Module");
    expect(formatPageKind(messages, "concept")).toBe("Concept");
    expect(formatPageKind(messages, "not-a-real-kind")).toBe("not-a-real-kind");
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
