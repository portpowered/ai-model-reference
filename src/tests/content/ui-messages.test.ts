import { afterEach, describe, expect, it } from "bun:test";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  formatPageKind,
  loadUiMessages,
  UI_MESSAGES_COMPATIBILITY_KEYS,
} from "@/lib/content/ui-messages";
import type {
  AiDomainMessages,
  ShellMessages,
} from "@/lib/content/ui-messages.types";
import {
  loadUiMessagesFromDisk,
  UiMessagesLoadError,
} from "@/lib/content/ui-messages-load";

const SHELL_MESSAGE_KEYS = ["search", "nav", "language", "shell"] as const;

const DOCS_MESSAGE_KEYS = [
  "searchEntry",
  "home",
  "browseIndex",
  "glossaryIndex",
  "architectureIndex",
  "pageKind",
] as const;

const AI_DOMAIN_MESSAGE_KEYS = [
  "timelinePage",
  "topologyBrowse",
  "topologyPrototype",
  "modelsIndex",
  "modulesIndex",
  "conceptsIndex",
  "papersIndex",
  "trainingIndex",
  "systemsIndex",
  "tagsIndex",
  "tagLanding",
  "tagCategories",
] as const;

function acceptsShellMessages(messages: ShellMessages): ShellMessages {
  return messages;
}

function acceptsAiDomainMessages(messages: AiDomainMessages): AiDomainMessages {
  return messages;
}

function pickShellMessages(messages: ShellMessages): ShellMessages {
  return {
    search: messages.search,
    nav: messages.nav,
    language: messages.language,
    shell: messages.shell,
  };
}

function pickAiDomainMessages(messages: AiDomainMessages): AiDomainMessages {
  return {
    timelinePage: messages.timelinePage,
    topologyBrowse: messages.topologyBrowse,
    topologyPrototype: messages.topologyPrototype,
    modelsIndex: messages.modelsIndex,
    modulesIndex: messages.modulesIndex,
    conceptsIndex: messages.conceptsIndex,
    papersIndex: messages.papersIndex,
    trainingIndex: messages.trainingIndex,
    systemsIndex: messages.systemsIndex,
    tagsIndex: messages.tagsIndex,
    tagLanding: messages.tagLanding,
    tagCategories: messages.tagCategories,
  };
}

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

describe("message boundary contracts", () => {
  it("loads representative shell message values through loadUiMessages", async () => {
    const messages = await loadUiMessages();
    expect(messages.search.placeholder).toBe("Search Model Atlas…");
    expect(messages.search.open).toBe("Open search");
    expect(messages.language.selectorLabel).toBe("Language");
    expect(messages.language.locales.en).toBe("English");
    expect(messages.shell.sidebarTitle).toBe("Reference");
    expect(messages.shell.onThisPage).toBe("On this page");
    expect(messages.nav.topology).toBe("Topology");
    expect(messages.nav.timeline).toBe("Timeline");
  });

  it("loads representative AI domain message values through loadUiMessages", async () => {
    const messages = await loadUiMessages();
    expect(messages.timelinePage.title).toBe("Timeline");
    expect(messages.timelinePage.eyebrow).toBe("Ontology timeline");
    expect(messages.topologyBrowse.graphMapLabel).toBe("Graph Map");
    expect(
      messages.topologyBrowse.classificationLabels.attentionMechanisms,
    ).toBe("Attention Mechanisms");
    expect(messages.topologyPrototype.title).toBe("Topology");
    expect(messages.topologyPrototype.graphLabel).toBe(
      "Activation/feed-forward topology preview",
    );
    expect(messages.modelsIndex.title).toBe("Models");
    expect(messages.tagLanding.searchHandoff).toBe("Search this tag");
  });

  it("assigns shell-shaped data to ShellMessages without AI domain fields", () => {
    const shellShaped: ShellMessages = {
      search: {
        open: "Open search",
        placeholder: "Search…",
        close: "Close search",
        idle: "Type to search.",
        noResults: "No results.",
        loading: "Searching…",
        error: "Search unavailable.",
        retry: "Try again",
        shortcut: "Search",
        resultPath: "Path",
      },
      nav: {
        home: "Home",
        search: "Search",
        menu: "Open menu",
        architecture: "Architecture",
        topology: "Topology",
        glossary: "Glossary",
        timeline: "Timeline",
        tags: "Tags",
      },
      language: {
        open: "Switch language",
        selectorLabel: "Language",
        unavailable: "Not available",
        locales: { en: "English" },
      },
      shell: {
        sidebarTitle: "Reference",
        sidebarDescription: "Browse modules.",
        onThisPage: "On this page",
        openingSummary: "Opening summary",
      },
    };

    expect(acceptsShellMessages(shellShaped)).toBe(shellShaped);
    expect("timelinePage" in shellShaped).toBe(false);
    expect("topologyBrowse" in shellShaped).toBe(false);
  });

  it("distinguishes AiDomainMessages from shell-only message groups", async () => {
    const messages = await loadUiMessages();
    const shellOnly = pickShellMessages(messages);
    const aiDomain = pickAiDomainMessages(messages);

    expect(acceptsShellMessages(shellOnly)).toBe(shellOnly);
    expect(acceptsAiDomainMessages(aiDomain)).toBe(aiDomain);

    for (const shellKey of SHELL_MESSAGE_KEYS) {
      expect(shellKey in aiDomain).toBe(false);
    }
    for (const domainKey of AI_DOMAIN_MESSAGE_KEYS) {
      expect(domainKey in shellOnly).toBe(false);
    }

    const boundaryKeys = new Set([
      ...SHELL_MESSAGE_KEYS,
      ...DOCS_MESSAGE_KEYS,
      ...AI_DOMAIN_MESSAGE_KEYS,
    ]);
    expect(boundaryKeys.size).toBe(
      SHELL_MESSAGE_KEYS.length +
        DOCS_MESSAGE_KEYS.length +
        AI_DOMAIN_MESSAGE_KEYS.length,
    );
    for (const key of UI_MESSAGES_COMPATIBILITY_KEYS) {
      expect(boundaryKeys.has(key)).toBe(true);
    }
  });
});
