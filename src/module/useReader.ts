import { computed, markRaw, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { pickDirectory, readDirectory } from "../api/localFiles";
import { readConfigValue, writeConfigValue } from "../api/readerConfig";
import type {
  FileSystemDirectoryHandleLike,
  FileSystemFileHandleLike,
  GlobalSearchResult,
  LocalEntry,
  PreviewState,
  TextPreviewWorkerMode
} from "../types";
import { extensionOf, isImageExtension } from "../utils/fileKind";
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
import { createGlobalSearchActions } from "./reader/globalSearch";
import type { LineMode } from "./reader/workerLineStyles";
import { lineTextPreview } from "./reader/workerLineDocument";
import type { HtmlPreviewMode, ImageDisplayMode } from "./reader/types";

const urlStore = createObjectUrlStore();
const HTML_PREVIEW_MODE_KEY = "reader.htmlPreviewMode";
const IMAGE_DISPLAY_MODE_KEY = "reader.imageDisplayMode";

interface CachedImage {
  name: string;
  pathKey: string;
  handle: FileSystemFileHandleLike;
  file: File;
  url: string;
}

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
  const imageDisplayMode = ref<ImageDisplayMode>("fit-page");
  const draftText = ref("");
  const currentFileDirectoryPath = ref<string[]>([]);
  const pendingPreviewLineJump = ref(0);
  const pendingPreviewLineJumpToken = ref(0);
  const searchKeyword = ref("");
  const fileTitle = ref("未打开文件");
  const fileMeta = ref("支持 文本、PDF、Office、PSD、图片、音频和视频");
  const previewTiming = ref({ readMs: 0, processMs: 0 });
  const { loadVersion, loadAbortController, loadWorker } = createLoadingState();
  const { confirmDialog, confirmLargeText, resolveConfirmDialog, cancelLargeTextConfirm } = createLargeTextConfirm();
  const preview = reactive(initialPreview());
  const pathLabel = computed(() => (stack.value.length ? `${stack.value.join("/")}/` : "未选择目录"));
  const filteredEntries = computed(() => filterEntries(entries.value, searchKeyword.value));
  const imageEntries = computed(() =>
    entries.value.filter(item => item.kind === "file" && isImageExtension(extensionOf(item.name)))
  );
  const currentImageIndex = computed(() =>
    preview.kind === "media" && preview.mediaKind === "image"
      ? imageEntries.value.findIndex(item => item.name === selectedName.value)
      : -1
  );
  const currentEntryIndex = computed(() =>
    entries.value.findIndex(item => item.name === selectedName.value)
  );
  const imageCount = computed(() => imageEntries.value.length);
  const imagePosition = computed(() => (currentImageIndex.value >= 0 ? currentImageIndex.value + 1 : 0));
  const canOpenPreviousImage = computed(() => currentImageIndex.value > 0);
  const canOpenNextImage = computed(() => currentImageIndex.value >= 0 && currentImageIndex.value < imageEntries.value.length - 1);
  const canOpenPreviousEntry = computed(() => currentEntryIndex.value > 0);
  const canOpenNextEntry = computed(() => currentEntryIndex.value >= 0 && currentEntryIndex.value < entries.value.length - 1);
  const selectedEntryIsContainer = computed(() => {
    const entry = entries.value[currentEntryIndex.value];
    return Boolean(entry && (entry.kind === "directory" || isArchiveFileName(entry.name)));
  });
  const imageWindowCache = new Map<string, CachedImage>();
  let imageWindowToken = 0;

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
  const { openFile: openPreviewFile, saveTextAndRefresh, openPreloadedImage } = createFilePreviewActions({
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
  const { globalSearch, startGlobalSearch, cancelGlobalSearch, clearGlobalSearch } = createGlobalSearchActions({
    currentHandle,
    directoryTrail,
    stack
  });

  watch(currentFile, () => {
    previewEditing.value = false;
    draftText.value = "";
  });

  watch([currentImageIndex, imageEntries], () => {
    void preloadImageWindow();
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
    void restoreImageDisplayMode();
  });

  onUnmounted(() => {
    clearImageWindow();
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
    clearImageWindow();
    entries.value = await readDirectory(handle);
    currentHandle.value = handle;
    autoSelectFirstEntry();
  }

  /**
   * 进入新目录后自动选中第一项：容器仅选中，普通文件直接打开。
   * @returns 无返回值。
   */
  function autoSelectFirstEntry(): void {
    if (!entries.value.length) return;
    if (entries.value.some(e => e.name === selectedName.value)) return;
    const first = entries.value[0];
    selectedName.value = first.name;
    if (first.kind === "directory" || isArchiveFileName(first.name)) {
      rememberSession();
      return;
    }
    void openFileAndRemember(first.name, first.handle as FileSystemFileHandleLike);
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
   * 打开全局搜索结果。
   * @param result 搜索结果。
   * @returns 异步完成信号。
   */
  async function openGlobalSearchResult(result: GlobalSearchResult): Promise<void> {
    cancelLargeTextConfirm();
    searchKeyword.value = "";
    if (result.kind === "directory") {
      stack.value = [rootHandle.value?.name || stack.value[0] || "本地目录", ...result.pathParts];
      directoryTrail.value = [...result.directoryTrail, result.handle as FileSystemDirectoryHandleLike];
      await loadDirectory(result.handle as FileSystemDirectoryHandleLike);
      return;
    }
    stack.value = [rootHandle.value?.name || stack.value[0] || "本地目录", ...result.directoryPath];
    directoryTrail.value = result.directoryTrail;
    await loadDirectory(result.directoryHandle);
    selectedName.value = result.name;
    await openFileAndRemember(result.name, result.handle as FileSystemFileHandleLike);
    if (result.lineNumber) {
      if (lastWorkerMode.value === "html") {
        htmlPreviewMode.value = "code";
        void writeHtmlPreviewMode("code");
        const next = lineTextPreview(currentText.value, "html");
        if (next.kind === "lineText") next.lineText = markRaw(next.lineText);
        lastWorkerMode.value = "html-code";
        setPreview(next);
      }
      pendingPreviewLineJump.value = result.lineNumber;
      pendingPreviewLineJumpToken.value += 1;
    }
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
   * 设置图片显示模式并写入本地配置。
   * @param mode 图片显示模式。
   * @returns 无返回值。
   */
  function setImageDisplayMode(mode: ImageDisplayMode): void {
    imageDisplayMode.value = mode;
    void writeImageDisplayMode(mode);
  }

  /**
   * 打开当前目录中的相邻图片。
   * @param offset 相邻偏移，-1 表示上一张，1 表示下一张。
   * @returns 异步完成信号。
   */
  async function openSiblingImage(offset: -1 | 1): Promise<void> {
    const next = imageEntries.value[currentImageIndex.value + offset];
    if (!next || next.kind !== "file") return;
    selectedName.value = next.name;
    if (useCachedImage(next)) {
      rememberSession(next.name);
      void preloadImageWindow();
      return;
    }
    await openFileAndRemember(next.name, next.handle as FileSystemFileHandleLike);
  }

  /**
   * 打开当前目录中的相邻条目。
   * 容器类型（目录/压缩包）仅选中不进入，普通文件直接打开。
   * @param offset 相邻偏移，-1 表示上一个，1 表示下一个。
   * @returns 异步完成信号。
   */
  async function openSiblingEntry(offset: -1 | 1): Promise<void> {
    const next = entries.value[currentEntryIndex.value + offset];
    if (!next) return;
    selectedName.value = next.name;
    if (next.kind === "directory" || isArchiveFileName(next.name)) {
      rememberSession();
      return;
    }
    await openFileAndRemember(next.name, next.handle as FileSystemFileHandleLike);
  }

  /**
   * 打开当前选中的容器条目（目录或压缩包）。
   * @returns 异步完成信号。
   */
  async function openSelectedEntry(): Promise<void> {
    const entry = entries.value[currentEntryIndex.value];
    if (!entry) return;
    await openEntry(entry);
  }

  /**
   * 使用图片窗口中的缓存图片。
   * @param entry 目标图片条目。
   * @returns 是否命中窗口缓存。
   */
  function useCachedImage(entry: LocalEntry): boolean {
    const cached = imageWindowCache.get(imageCacheKey(currentPathKey(), entry.name));
    if (!cached || !isSameCacheTarget(cached, entry)) return false;
    openPreloadedImage(cached.file, cached.handle, cached.url);
    return true;
  }

  /**
   * 后台维护上一张、当前张、下一张图片窗口。
   * @returns 异步完成信号。
   */
  async function preloadImageWindow(): Promise<void> {
    if (currentImageIndex.value < 0) {
      clearImageWindow();
      return;
    }
    const pathKey = currentPathKey();
    const targets = imageWindowEntries();
    if (!targets.length) {
      clearImageWindow();
      return;
    }
    const token = ++imageWindowToken;
    const targetKeys = new Set(targets.map(item => imageCacheKey(pathKey, item.name)));
    pruneImageWindow(targetKeys);
    await Promise.all(targets.map(item => ensureCachedImage(item, pathKey, token)));
  }

  /**
   * 获取当前窗口内的图片条目。
   * @returns 窗口图片条目。
   */
  function imageWindowEntries(): LocalEntry[] {
    return [currentImageIndex.value - 1, currentImageIndex.value, currentImageIndex.value + 1]
      .map(index => imageEntries.value[index])
      .filter((item): item is LocalEntry => Boolean(item && item.kind === "file"));
  }

  /**
   * 确保指定图片已进入窗口缓存。
   * @param target 目标图片条目。
   * @param pathKey 当前目录路径标识。
   * @param token 当前窗口任务令牌。
   * @returns 异步完成信号。
   */
  async function ensureCachedImage(target: LocalEntry, pathKey: string, token: number): Promise<void> {
    const key = imageCacheKey(pathKey, target.name);
    const existing = imageWindowCache.get(key);
    if (existing && isSameCacheTarget(existing, target)) return;
    if (existing) {
      URL.revokeObjectURL(existing.url);
      imageWindowCache.delete(key);
    }
    const handle = target.handle as FileSystemFileHandleLike;
    try {
      const file = await handle.getFile();
      if (token !== imageWindowToken || pathKey !== currentPathKey()) return;
      const url = URL.createObjectURL(file);
      try {
        await decodeImageUrl(url);
      } catch {
        URL.revokeObjectURL(url);
        return;
      }
      if (token !== imageWindowToken || pathKey !== currentPathKey()) {
        URL.revokeObjectURL(url);
        return;
      }
      imageWindowCache.set(key, { name: target.name, pathKey, handle, file, url });
    } catch {
      // 窗口缓存失败不影响当前阅读；真正打开时仍走正常加载流程。
    }
  }

  /**
   * 清理整个图片窗口缓存。
   * @returns 无返回值。
   */
  function clearImageWindow(): void {
    imageWindowToken += 1;
    for (const cached of imageWindowCache.values()) URL.revokeObjectURL(cached.url);
    imageWindowCache.clear();
  }

  /**
   * 裁剪图片窗口缓存。
   * @param targetKeys 需要保留的缓存键。
   * @returns 无返回值。
   */
  function pruneImageWindow(targetKeys: Set<string>): void {
    for (const [key, cached] of imageWindowCache) {
      if (targetKeys.has(key)) continue;
      URL.revokeObjectURL(cached.url);
      imageWindowCache.delete(key);
    }
  }

  /**
   * 判断缓存是否对应当前目录下的目标图片。
   * @param cached 已缓存图片。
   * @param entry 目标条目。
   * @returns 是否同一目标。
   */
  function isSameCacheTarget(cached: CachedImage, entry: LocalEntry): boolean {
    return cached.pathKey === currentPathKey() && cached.name === entry.name && cached.handle === entry.handle;
  }

  /**
   * 当前目录路径标识。
   * @returns 路径标识。
   */
  function currentPathKey(): string {
    return stack.value.join("\0");
  }

  /**
   * 生成图片窗口缓存键。
   * @param pathKey 目录路径标识。
   * @param name 文件名。
   * @returns 缓存键。
   */
  function imageCacheKey(pathKey: string, name: string): string {
    return `${pathKey}\0${name}`;
  }

  /**
   * 恢复 HTML 预览模式配置。
   * @returns 异步完成信号。
   */
  async function restoreHtmlPreviewMode(): Promise<void> {
    htmlPreviewMode.value = await readHtmlPreviewMode();
  }

  /**
   * 恢复图片显示模式配置。
   * @returns 异步完成信号。
   */
  async function restoreImageDisplayMode(): Promise<void> {
    imageDisplayMode.value = await readImageDisplayMode();
  }

  return {
    entries,
    currentHandle,
    filteredEntries,
    imageCount,
    imagePosition,
    canOpenPreviousImage,
    canOpenNextImage,
    canOpenPreviousEntry,
    canOpenNextEntry,
    selectedEntryIsContainer,
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
    imageDisplayMode,
    preview,
    fileTitle,
    fileMeta,
    previewTiming,
    confirmDialog,
    pathLabel,
    rootHandle,
    currentFileDirectoryPath,
    pendingPreviewLineJump,
    pendingPreviewLineJumpToken,
    globalSearch,
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
    setImageDisplayMode,
    startGlobalSearch,
    cancelGlobalSearch,
    clearGlobalSearch,
    openGlobalSearchResult,
    openPreviousImage: () => openSiblingImage(-1),
    openNextImage: () => openSiblingImage(1),
    openPreviousEntry: () => openSiblingEntry(-1),
    openNextEntry: () => openSiblingEntry(1),
    openSelectedEntry,
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

async function readImageDisplayMode(): Promise<ImageDisplayMode> {
  try {
    const mode = await readConfigValue<ImageDisplayMode>(IMAGE_DISPLAY_MODE_KEY);
    return isImageDisplayMode(mode) ? mode : "fit-page";
  } catch {
    return "fit-page";
  }
}

async function writeImageDisplayMode(mode: ImageDisplayMode): Promise<void> {
  try {
    await writeConfigValue<ImageDisplayMode>(IMAGE_DISPLAY_MODE_KEY, mode);
  } catch {
    // Ignore storage failures; the current session still switches correctly.
  }
}

function isImageDisplayMode(value: unknown): value is ImageDisplayMode {
  return value === "fit-page" || value === "fit-width" || value === "fit-height" || value === "original";
}

async function decodeImageUrl(url: string): Promise<void> {
  const image = new Image();
  image.src = url;
  if (image.decode) {
    await image.decode();
    return;
  }
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("图片解码失败"));
  });
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
