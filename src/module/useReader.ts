import { computed, reactive, ref } from "vue";
import { pickDirectory, readDirectory } from "../api/localFiles";
import type { FileSystemDirectoryHandleLike, FileSystemFileHandleLike, LocalEntry, PreviewState } from "../types";
import { createObjectUrlStore } from "../utils/objectUrls";
import { initialPreview, noticePreview } from "../utils/previewFactory";
import { createFilePreviewActions } from "./reader/filePreview";
import { createNavigationActions } from "./reader/navigation";
import { createViewStateActions } from "./reader/viewState";
import { createLargeTextConfirm } from "./reader/confirmDialog";

const urlStore = createObjectUrlStore();

/**
 * 提供阅读器页面的核心状态和动作。
 * @returns 阅读器状态、计算值和行为方法。
 */
export function useReader() {
  const rootHandle = ref<FileSystemDirectoryHandleLike | null>(null);
  const currentHandle = ref<FileSystemDirectoryHandleLike | null>(null);
  const stack = ref<string[]>([]);
  const entries = ref<LocalEntry[]>([]);
  const selectedName = ref("");
  const currentFile = ref<File | null>(null);
  const currentText = ref("");
  const currentFileDirectoryPath = ref<string[]>([]);
  const searchKeyword = ref("");
  const fileTitle = ref("未打开文件");
  const fileMeta = ref("支持 文本、图片、音频和视频");
  const previewTiming = ref({ readMs: 0, processMs: 0 });
  const loadVersion = ref(0);
  const loadAbortController = ref<AbortController | null>(null);
  const loadWorker = ref<Worker | null>(null);
  const { confirmDialog, confirmLargeText, resolveConfirmDialog, cancelLargeTextConfirm } = createLargeTextConfirm();
  const preview = reactive(initialPreview());
  const pathLabel = computed(() => (stack.value.length ? `${stack.value.join("/")}/` : "未选择目录"));
  const filteredEntries = computed(() => filterEntries(entries.value, searchKeyword.value));

  const viewContext = {
    currentFile,
    currentText,
    currentFileDirectoryPath,
    fileTitle,
    fileMeta,
    previewTiming,
    loadAbortController,
    loadWorker,
    setPreview,
    urlStore
  };
  const { showEmpty, showNotice } = createViewStateActions({ ...viewContext, loadVersion });
  const { openFile } = createFilePreviewActions({
    ...viewContext,
    rootHandle,
    stack,
    loadVersion,
    loadAbortController,
    loadWorker,
    confirmLargeText,
    cancelLargeTextConfirm
  });
  const navigation = createNavigationActions({
    rootHandle,
    stack,
    selectedName,
    searchKeyword,
    currentFileDirectoryPath,
    loadDirectory,
    openFile,
    showEmpty
  });

  if (!window.showDirectoryPicker) {
    Object.assign(preview, noticePreview("当前浏览器不支持本地目录选择。请使用新版 Chrome、Edge 或其他支持 File System Access API 的浏览器打开此页面。"));
  }

  /**
   * 打开本地目录并加载根目录内容。
   * @returns 异步完成信号。
   */
  async function openDirectory(): Promise<void> {
    try {
      cancelLargeTextConfirm();
      const handle = await pickDirectory();
      rootHandle.value = handle;
      stack.value = [handle.name || "本地目录"];
      await loadDirectory(handle);
      showEmpty("选择左侧文件进行预览", "文本、图片、音频、视频和可解码文件会在右侧显示。");
    } catch (error) {
      if ((error as Error).name !== "AbortError") showNotice(`无法打开目录：${(error as Error).message}`);
    }
  }

  /**
   * 加载指定目录的子项。
   * @param handle 目录句柄。
   * @returns 异步完成信号。
   */
  async function loadDirectory(handle: FileSystemDirectoryHandleLike | null): Promise<void> {
    if (!handle) return;
    entries.value = await readDirectory(handle);
    currentHandle.value = handle;
  }

  /**
   * 打开列表中的文件或目录。
   * @param item 列表项。
   * @returns 异步完成信号。
   */
  async function openEntry(item: LocalEntry): Promise<void> {
    selectedName.value = item.name;
    if (item.kind === "directory") {
      cancelLargeTextConfirm();
      await navigation.openDirectoryEntry(item);
      return;
    }
    await openFile(item.name, item.handle as FileSystemFileHandleLike);
  }

  /**
   * 复制当前文本内容。
   * @returns 异步完成信号。
   */
  async function copyCurrentText(): Promise<void> {
    if (currentText.value) await navigator.clipboard.writeText(currentText.value);
  }

  /**
   * 下载当前文件。
   * @returns 无返回值。
   */
  function downloadCurrentFile(): void {
    if (!currentFile.value) return;
    const url = URL.createObjectURL(currentFile.value);
    const link = document.createElement("a");
    link.href = url;
    link.download = currentFile.value.name;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  /**
   * 更新预览状态。
   * @param next 下一个预览状态。
   * @returns 无返回值。
   */
  function setPreview(next: PreviewState): void {
    Object.assign(preview, next);
  }

  /**
   * 返回上一级目录并取消等待中的大文件确认。
   * @returns 异步完成信号。
   */
  async function goUp(): Promise<void> {
    cancelLargeTextConfirm();
    await navigation.goUp();
  }

  /**
   * 回到根目录并取消等待中的大文件确认。
   * @returns 异步完成信号。
   */
  async function goHome(): Promise<void> {
    cancelLargeTextConfirm();
    await navigation.goHome();
  }

  return {
    entries,
    currentHandle,
    filteredEntries,
    selectedName,
    searchKeyword,
    currentFile,
    currentText,
    preview,
    fileTitle,
    fileMeta,
    previewTiming,
    confirmDialog,
    pathLabel,
    rootHandle,
    currentFileDirectoryPath,
    openDirectory,
    loadDirectory,
    openEntry,
    goUp,
    goHome,
    openRelativeDocument: navigation.openRelativeDocument,
    copyCurrentText,
    downloadCurrentFile,
    createObjectUrl: urlStore.create,
    resolveConfirmDialog
  };
}

/**
 * 根据关键词过滤目录项。
 * @param list 完整条目列表。
 * @param keyword 搜索关键词。
 * @returns 过滤后的条目列表。
 */
function filterEntries(list: LocalEntry[], keyword: string): LocalEntry[] {
  const normalized = keyword.trim().toLowerCase();
  return normalized ? list.filter(item => item.name.toLowerCase().includes(normalized)) : list;
}
