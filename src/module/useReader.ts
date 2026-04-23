import { computed, markRaw, onMounted, reactive, ref, watch } from "vue";
import { pickDirectory, readDirectory } from "../api/localFiles";
import { readConfigValue, writeConfigValue } from "../api/readerConfig";
import type {
  FileSystemDirectoryHandleLike,
  FileSystemFileHandleLike,
  LocalEntry,
  PreviewState,
  TextPreviewWorkerMode
} from "../types";
import { createObjectUrlStore } from "../utils/objectUrls";
import { initialPreview, noticePreview } from "../utils/previewFactory";
import { createFilePreviewActions } from "./reader/filePreview";
import { createNavigationActions } from "./reader/navigation";
import { createViewStateActions } from "./reader/viewState";
import { createLargeTextConfirm } from "./reader/confirmDialog";
import { copyCurrentText, downloadCurrentFile } from "./reader/fileCommands";
import { createLoadingState } from "./reader/loadingState";
import { createArchiveDirectoryHandle, isArchiveFileName } from "./reader/archiveHandles";
import { createSessionActions } from "./reader/sessionActions";
import type { LineMode } from "./reader/workerLineStyles";
import { lineTextPreview } from "./reader/workerLineDocument";
import type { HtmlPreviewMode } from "./reader/types";

const urlStore = createObjectUrlStore();
const HTML_PREVIEW_MODE_KEY = "reader.htmlPreviewMode";

/**
 * 提供阅读器页面的核心状态和动作。
 * @returns 阅读器状态、计算值和行为方法。
 */
export function useReader() {
  const rootHandle = ref<FileSystemDirectoryHandleLike | null>(null);
  const currentHandle = ref<FileSystemDirectoryHandleLike | null>(null);
  const directoryTrail = ref<FileSystemDirectoryHandleLike[]>([]);
  const stack = ref<string[]>([]);
  const entries = ref<LocalEntry[]>([]);
  const selectedName = ref("");
  const currentFile = ref<File | null>(null);
  const currentText = ref("");
  const currentFileHandle = ref<FileSystemFileHandleLike | null>(null);
  const lastWorkerMode = ref<TextPreviewWorkerMode | null>(null);
  const previewEditing = ref(false);
  const htmlPreviewMode = ref<HtmlPreviewMode>("web");
  const draftText = ref("");
  const currentFileDirectoryPath = ref<string[]>([]);
  const searchKeyword = ref("");
  const fileTitle = ref("未打开文件");
  const fileMeta = ref("支持 文本、PDF、Office、PSD、图片、音频和视频");
  const previewTiming = ref({ readMs: 0, processMs: 0 });
  const { loadVersion, loadAbortController, loadWorker } = createLoadingState();
  const { confirmDialog, confirmLargeText, resolveConfirmDialog, cancelLargeTextConfirm } = createLargeTextConfirm();
  const preview = reactive(initialPreview());
  const pathLabel = computed(() => (stack.value.length ? `${stack.value.join("/")}/` : "未选择目录"));
  const filteredEntries = computed(() => filterEntries(entries.value, searchKeyword.value));

  const viewContext = {
    currentFile,
    currentText,
    currentFileHandle,
    lastWorkerMode,
    currentFileDirectoryPath,
    fileTitle,
    fileMeta,
    previewTiming,
    htmlPreviewMode,
    loadAbortController,
    loadWorker,
    setPreview,
    urlStore
  };
  const { showEmpty, showNotice } = createViewStateActions({ ...viewContext, loadVersion });
  const { openFile: openPreviewFile, saveTextAndRefresh } = createFilePreviewActions({
    ...viewContext,
    rootHandle,
    stack,
    loadVersion,
    loadAbortController,
    loadWorker,
    confirmLargeText,
    cancelLargeTextConfirm
  });
  const { rememberSession, restoreLastSession } = createSessionActions({
    rootHandle,
    currentHandle,
    directoryTrail,
    stack,
    entries,
    selectedName,
    searchKeyword,
    loadDirectory,
    openPreviewFile,
    showEmpty,
    showNotice
  });
  const canEditPreview = computed(() => {
    const k = preview.kind;
    return (k === "lineText" || k === "markdown" || k === "html") && Boolean(lastWorkerMode.value);
  });
  const editLineMode = computed<LineMode>(() => (lastWorkerMode.value === "html-code" ? "html" : (lastWorkerMode.value as LineMode | null) ?? "text"));
  const canToggleHtmlPreview = computed(() => lastWorkerMode.value === "html" || lastWorkerMode.value === "html-code");
  const canSave = computed(
    () =>
      Boolean(
        currentFileHandle.value?.createWritable &&
          lastWorkerMode.value &&
          previewEditing.value &&
          draftText.value !== currentText.value
      )
  );

  watch(currentFile, () => {
    previewEditing.value = false;
    draftText.value = "";
  });

  const navigation = createNavigationActions({
    rootHandle,
    directoryTrail,
    stack,
    selectedName,
    searchKeyword,
    currentFileDirectoryPath,
    loadDirectory,
    openFile: openFileAndRemember,
    showEmpty
  });

  if (!window.showDirectoryPicker) {
    Object.assign(preview, noticePreview("当前浏览器不支持本地目录选择。请使用新版 Chrome、Edge 或其他支持 File System Access API 的浏览器打开此页面。"));
  }

  onMounted(() => {
    void restoreHtmlPreviewMode();
  });

  /**
   * 打开本地目录并加载根目录内容。
   * @returns 异步完成信号。
   */
  async function openDirectory(): Promise<void> {
    try {
      cancelLargeTextConfirm();
      const handle = await pickDirectory();
      rootHandle.value = handle;
      directoryTrail.value = [handle];
      stack.value = [handle.name || "本地目录"];
      await loadDirectory(handle);
      rememberSession();
      showEmpty("选择左侧文件进行预览", "文本、PDF、Office、PSD、图片、音频、视频和可解码文件会在右侧显示。");
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
      rememberSession();
      return;
    }
    if (isArchiveFileName(item.name)) {
      cancelLargeTextConfirm();
      await openArchiveEntry(item);
      return;
    }
    await openFileAndRemember(item.name, item.handle as FileSystemFileHandleLike);
  }

  /**
   * 打开文件并记录为下次启动恢复目标。
   * @param name 文件名。
   * @param handle 文件句柄。
   * @returns 异步完成信号。
   */
  async function openFileAndRemember(name: string, handle: FileSystemFileHandleLike): Promise<void> {
    await openPreviewFile(name, handle);
    rememberSession(name);
  }

  /**
   * 将压缩包作为只读虚拟目录打开。
   * @param item 压缩包文件项。
   * @returns 异步完成信号。
   */
  async function openArchiveEntry(item: LocalEntry): Promise<void> {
    try {
      const archiveHandle = await createArchiveDirectoryHandle(item.name, item.handle as FileSystemFileHandleLike);
      stack.value.push(item.name);
      directoryTrail.value.push(archiveHandle);
      searchKeyword.value = "";
      selectedName.value = "";
      await loadDirectory(archiveHandle);
      showEmpty(`压缩包：${item.name}`, "选择压缩包内文件进行预览，或继续进入子文件夹。");
    } catch (error) {
      showNotice(`无法打开压缩包：${(error as Error).message}`);
    }
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
    rememberSession();
  }

  /**
   * 回到根目录并取消等待中的大文件确认。
   * @returns 异步完成信号。
   */
  async function goHome(): Promise<void> {
    cancelLargeTextConfirm();
    await navigation.goHome();
    rememberSession();
  }

  /**
   * 切换预览/原始文本编辑模式。
   * @returns 无返回值。
   */
  function togglePreviewEdit(): void {
    if (previewEditing.value) {
      if (draftText.value !== currentText.value) {
        if (!window.confirm("放弃未保存的修改并返回预览？")) return;
      }
      previewEditing.value = false;
      draftText.value = "";
      return;
    }
    draftText.value = currentText.value;
    previewEditing.value = true;
  }

  /**
   * 将草稿写入磁盘并刷新预览。
   * @returns 异步完成信号。
   */
  async function saveDraft(): Promise<void> {
    try {
      await saveTextAndRefresh(draftText.value);
      previewEditing.value = false;
      draftText.value = "";
    } catch (error) {
      window.alert(`保存失败：${(error as Error).message}`);
    }
  }

  function toggleHtmlPreviewMode(): void {
    htmlPreviewMode.value = htmlPreviewMode.value === "web" ? "code" : "web";
    void writeHtmlPreviewMode(htmlPreviewMode.value);
    if (!currentFile.value || !canToggleHtmlPreview.value) return;
    if (htmlPreviewMode.value === "web") {
      lastWorkerMode.value = "html";
      setPreview({ kind: "html", html: currentText.value });
      return;
    }
    const next = lineTextPreview(currentText.value, "html");
    if (next.kind === "lineText") next.lineText = markRaw(next.lineText);
    lastWorkerMode.value = "html-code";
    setPreview(next);
  }

  /**
   * 恢复 HTML 预览模式配置。
   * @returns 异步完成信号。
   */
  async function restoreHtmlPreviewMode(): Promise<void> {
    htmlPreviewMode.value = await readHtmlPreviewMode();
  }

  return {
    entries,
    currentHandle,
    filteredEntries,
    selectedName,
    searchKeyword,
    currentFile,
    currentText,
    previewEditing,
    draftText,
    canEditPreview,
    canToggleHtmlPreview,
    canSave,
    editLineMode,
    htmlPreviewMode,
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
    restoreLastSession,
    openRelativeDocument: navigation.openRelativeDocument,
    copyCurrentText: () => copyCurrentText(currentText),
    downloadCurrentFile: () => downloadCurrentFile(currentFile),
    saveDraft,
    togglePreviewEdit,
    toggleHtmlPreviewMode,
    createObjectUrl: urlStore.create,
    resolveConfirmDialog
  };
}

async function readHtmlPreviewMode(): Promise<HtmlPreviewMode> {
  try {
    return (await readConfigValue<HtmlPreviewMode>(HTML_PREVIEW_MODE_KEY)) === "code" ? "code" : "web";
  } catch {
    return "web";
  }
}

async function writeHtmlPreviewMode(mode: HtmlPreviewMode): Promise<void> {
  try {
    await writeConfigValue<HtmlPreviewMode>(HTML_PREVIEW_MODE_KEY, mode);
  } catch {
    // Ignore storage failures; the current session still switches correctly.
  }
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
