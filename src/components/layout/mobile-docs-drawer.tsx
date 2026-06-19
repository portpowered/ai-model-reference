"use client";

import type * as PageTree from "fumadocs-core/page-tree";
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarViewport,
} from "fumadocs-ui/components/sidebar/base";
import { createPageTreeRenderer } from "fumadocs-ui/components/sidebar/page-tree";
import { TreeContextProvider } from "fumadocs-ui/contexts/tree";
import { X } from "lucide-react";
import { type ComponentProps, type ReactNode, useEffect } from "react";
import { Button } from "@/components/ui/button";
import type { UiMessages } from "@/lib/content/ui-messages.types";

type MobileDocsDrawerProps = {
  id: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  pageTree: PageTree.Root;
  messages: UiMessages;
  children?: ReactNode;
};

function collapseFolderDefaults<T extends PageTree.Root | PageTree.Node>(
  node: T,
): T {
  if ("children" in node && Array.isArray(node.children)) {
    return {
      ...node,
      ...(node.type === "folder" ? { defaultOpen: false } : {}),
      children: node.children.map((child) => collapseFolderDefaults(child)),
    };
  }

  return node;
}

const drawerPageTree = createPageTreeRenderer({
  SidebarFolder: DrawerSidebarFolder,
  SidebarFolderContent: DrawerSidebarFolderContent,
  SidebarFolderLink: DrawerSidebarFolderLink,
  SidebarFolderTrigger: DrawerSidebarFolderTrigger,
  SidebarItem: DrawerSidebarItem,
  SidebarSeparator: DrawerSidebarSeparator,
});
const DrawerPageTree = drawerPageTree;

export function MobileDocsDrawer({
  id,
  open,
  onOpenChange,
  pageTree,
  messages,
  children,
}: MobileDocsDrawerProps) {
  const mobilePageTree = collapseFolderDefaults(pageTree);

  useEffect(() => {
    if (!open) {
      return;
    }

    const previousOverflow = document.body.style.overflow;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onOpenChange(false);
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (!open) {
    return null;
  }

  return (
    <div className="md:hidden" data-state="open">
      <div
        className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden="true"
        onClick={() => onOpenChange(false)}
      />
      <aside
        id={id}
        role="dialog"
        aria-modal="true"
        aria-label={messages.shell.sidebarTitle}
        data-state="open"
        className="fixed inset-y-0 left-0 z-50 flex w-screen max-w-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground shadow-2xl transition-transform duration-300 ease-out"
      >
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-4">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
              Browse docs
            </p>
            <p className="truncate text-sm text-foreground">
              {messages.shell.sidebarTitle}
            </p>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label={messages.search.close}
            onClick={() => onOpenChange(false)}
          >
            <X className="size-4" aria-hidden />
          </Button>
        </div>
        {children ? (
          <div className="border-b border-sidebar-border px-4 py-4">
            {children}
          </div>
        ) : null}
        <TreeContextProvider tree={mobilePageTree}>
          <SidebarProvider>
            <SidebarViewport
              area={{ className: "min-h-0 flex-1" }}
              viewport={{
                className:
                  "*:flex! *:flex-col! *:gap-0.5! px-4 py-5 overscroll-contain",
              }}
            >
              <div
                onClickCapture={(event) => {
                  if ((event.target as HTMLElement).closest("a[href]")) {
                    onOpenChange(false);
                  }
                }}
              >
                <DrawerPageTree />
              </div>
            </SidebarViewport>
          </SidebarProvider>
        </TreeContextProvider>
      </aside>
    </div>
  );
}

function DrawerSidebarSeparator(props: ComponentProps<"p">) {
  return (
    <SidebarSeparator
      {...props}
      className="mb-2 mt-6 px-2 text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground first:mt-0"
    />
  );
}

function DrawerSidebarItem(props: ComponentProps<typeof SidebarItem>) {
  return (
    <SidebarItem
      {...props}
      className="relative flex items-center gap-2 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-primary"
    />
  );
}

function DrawerSidebarFolder(props: ComponentProps<typeof SidebarFolder>) {
  return <SidebarFolder {...props} />;
}

function DrawerSidebarFolderTrigger(
  props: ComponentProps<typeof SidebarFolderTrigger>,
) {
  return (
    <SidebarFolderTrigger
      {...props}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-left text-sm text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
      style={{
        paddingInlineStart: getItemOffset(0),
        ...props.style,
      }}
    />
  );
}

function DrawerSidebarFolderLink(
  props: ComponentProps<typeof SidebarFolderLink>,
) {
  return (
    <SidebarFolderLink
      {...props}
      className="flex w-full items-center gap-2 rounded-xl px-3 py-3 text-sm text-sidebar-foreground/78 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground data-[active=true]:bg-sidebar-primary/12 data-[active=true]:text-sidebar-primary"
      style={{
        paddingInlineStart: getItemOffset(0),
        ...props.style,
      }}
    />
  );
}

function DrawerSidebarFolderContent(
  props: ComponentProps<typeof SidebarFolderContent>,
) {
  return (
    <SidebarFolderContent
      {...props}
      className="relative ml-2 mt-1 border-l border-sidebar-border pl-2"
    />
  );
}

function getItemOffset(depth: number) {
  return `calc(${3 + 3 * depth} * var(--spacing))`;
}
