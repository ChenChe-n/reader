import { getFileFromDirectoryTrail, getHashSuffix, getPathWithoutSuffix } from "../../api/localFiles";
import type { FileSystemDirectoryHandleLike, FileSystemFileHandleLike, LocalEntry } from "../../types";
import type { Ref } from "vue";

export interface ReaderNavigationContext {
  rootHandle: Ref<FileSystemDirectoryHandleLike | null>;
  directoryTrail: Ref<FileSystemDirectoryHandleLike[]>;
  stack: Ref<string[]>;
  selectedName: Ref<string>;
  searchKeyword: Ref<string>;
  currentFileDirectoryPath: Ref<string[]>;
  loadDirectory(handle: FileSystemDirectoryHandleLike | null): Promise<void>;
  openFile(name: string, handle: FileSystemFileHandleLike): Promise<void>;
  showEmpty(title: string, message: string): void;
}

/**
 * 创建目录和相对文档导航操作。
 * @param context 导航上下文。
 * @returns 导航操作集合。
 */
export function createNavigationActions(context: ReaderNavigationContext) {
  /**
   * 打开目录列表项。
   * @param item 目录列表项。
   * @returns 异步完成信号。
   */
  async function openDirectoryEntry(item: LocalEntry): Promise<void> {
    context.stack.value.push(item.name);
    context.directoryTrail.value.push(item.handle as FileSystemDirectoryHandleLike);
    context.searchKeyword.value = "";
    await context.loadDirectory(item.handle as FileSystemDirectoryHandleLike);
    context.showEmpty(`当前目录：${item.name}`, "选择文件进行预览，或继续进入子文件夹。");
  }

  /**
   * 返回上一级目录。
   * @returns 异步完成信号。
   */
  async function goUp(): Promise<void> {
    if (!context.rootHandle.value || context.stack.value.length <= 1) return;
    context.stack.value.pop();
    context.directoryTrail.value.pop();
    const handle = context.directoryTrail.value[context.directoryTrail.value.length - 1] || context.rootHandle.value;
    resetDirectorySelection();
    await context.loadDirectory(handle);
    context.showEmpty("已返回上一级", "选择左侧文件进行预览。");
  }

  /**
   * 回到根目录。
   * @returns 异步完成信号。
   */
  async function goHome(): Promise<void> {
    if (!context.rootHandle.value) return;
    context.stack.value = [context.rootHandle.value.name || "本地目录"];
    context.directoryTrail.value = [context.rootHandle.value];
    resetDirectorySelection();
    await context.loadDirectory(context.rootHandle.value);
    context.showEmpty("已回到根目录", "选择左侧文件进行预览。");
  }

  /**
   * 打开当前文件中的本地相对链接。
   * @param rawHref 原始链接。
   * @returns 目标 hash，供视图滚动。
   */
  async function openRelativeDocument(rawHref: string): Promise<string> {
    if (!context.rootHandle.value) return "";
    const cleanPath = getPathWithoutSuffix(rawHref);
    const result = await getFileFromDirectoryTrail(context.directoryTrail.value, context.stack.value, cleanPath);
    if (!result) return "";
    context.stack.value = [context.rootHandle.value.name || "本地目录", ...result.directoryPath];
    context.directoryTrail.value = result.directoryTrail || context.directoryTrail.value;
    context.selectedName.value = result.file.name;
    context.searchKeyword.value = "";
    await context.loadDirectory(result.directory);
    await context.openFile(result.file.name, result.handle);
    return getHashSuffix(rawHref);
  }

  /**
   * 根据栈路径获取目录句柄。
   * @param names 根目录之后的路径片段。
   * @returns 目录句柄。
   */
  /**
   * 清理目录选择状态。
   * @returns 无返回值。
   */
  function resetDirectorySelection(): void {
    context.selectedName.value = "";
    context.searchKeyword.value = "";
  }

  return { openDirectoryEntry, goUp, goHome, openRelativeDocument };
}
