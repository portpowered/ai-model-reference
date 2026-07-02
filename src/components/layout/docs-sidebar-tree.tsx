"use client";

import { usePathname } from "fumadocs-core/framework";
import type * as PageTree from "fumadocs-core/page-tree";
import {
  SidebarFolder,
  SidebarFolderContent,
  SidebarFolderLink,
  SidebarFolderTrigger,
  SidebarItem,
  SidebarSeparator,
} from "fumadocs-ui/components/sidebar/base";
import { useTreePath } from "fumadocs-ui/contexts/tree";
import type { ReactNode } from "react";

function isActiveUrl(currentPath: string, targetPath: string) {
  return currentPath === targetPath || currentPath.startsWith(`${targetPath}/`);
}

const ROOT_ITEM_OFFSET = "0rem";
const SIDEBAR_ROW_CLASS =
  "relative flex w-full flex-row items-center gap-2 rounded-lg px-0 py-1.5 text-start text-sm text-fd-muted-foreground whitespace-nowrap [&_svg]:size-4 [&_svg]:shrink-0";
const TOP_LEVEL_ROW_CLASS =
  "relative flex w-full flex-row items-center gap-2 rounded-lg overflow-hidden whitespace-nowrap px-0 text-sm text-fd-foreground/85 transition-colors hover:bg-fd-accent/50 hover:text-fd-accent-foreground/80";
const ROOT_SECTION_GAP_CLASS = "mb-3";
const CHILD_NODE_GAP_CLASS = "mb-1";

export const docsSidebarTreeComponents = {
  Item: function DocsSidebarTreeItem({ item }: { item: PageTree.Item }) {
    const pathname = usePathname();

    return (
      <SidebarItem
        href={item.url}
        external={item.external}
        active={isActiveUrl(pathname, item.url)}
        icon={item.icon}
        className={`${SIDEBAR_ROW_CLASS} ${CHILD_NODE_GAP_CLASS} overflow-hidden text-ellipsis`}
        style={{
          paddingInlineStart: ROOT_ITEM_OFFSET,
        }}
      >
        {item.name}
      </SidebarItem>
    );
  },
  Folder: function DocsSidebarTreeFolder({
    item,
    children,
  }: {
    item: PageTree.Folder;
    children: ReactNode;
  }) {
    const pathname = usePathname();
    const path = useTreePath();

    return (
      <SidebarFolder
        collapsible={item.collapsible}
        active={path.includes(item)}
        defaultOpen={item.defaultOpen}
      >
        {item.index ? (
          <SidebarFolderLink
            href={item.index.url}
            active={isActiveUrl(pathname, item.index.url)}
            external={item.index.external}
            className={`${TOP_LEVEL_ROW_CLASS} ${ROOT_SECTION_GAP_CLASS} text-ellipsis`}
            style={{
              paddingInlineStart: ROOT_ITEM_OFFSET,
            }}
          >
            {item.icon}
            {item.name}
          </SidebarFolderLink>
        ) : (
          <SidebarFolderTrigger
            className={`${TOP_LEVEL_ROW_CLASS} ${ROOT_SECTION_GAP_CLASS} text-ellipsis`}
            style={{
              paddingInlineStart: ROOT_ITEM_OFFSET,
            }}
          >
            {item.icon}
            {item.name}
          </SidebarFolderTrigger>
        )}
        <SidebarFolderContent className="relative">
          <div className="flex flex-col gap-1 pt-0.5">{children}</div>
        </SidebarFolderContent>
      </SidebarFolder>
    );
  },
  Separator: function DocsSidebarTreeSeparator({
    item,
  }: {
    item: PageTree.Separator;
  }) {
    return (
      <SidebarSeparator
        className="mb-2.5 mt-6 px-0 text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-fd-foreground/55 first:mt-1"
        style={{
          paddingInlineStart: ROOT_ITEM_OFFSET,
        }}
      >
        {item.icon}
        {item.name}
      </SidebarSeparator>
    );
  },
} satisfies {
  Item: (props: { item: PageTree.Item }) => ReactNode;
  Folder: (props: { item: PageTree.Folder; children: ReactNode }) => ReactNode;
  Separator: (props: { item: PageTree.Separator }) => ReactNode;
};
