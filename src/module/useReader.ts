import { computed, reactive, ref } from "vue";
import { getFileFromRelativePath, getHashSuffix, getPathWithoutSuffix, pickDirectory, readDirectory } from "../api/localFiles";
import type { FileSystemDirectoryHandleLike, FileSystemFileHandleLike, LocalEntry, PreviewState } from "../types";
import { fileKindLabel, extensionOf, isAudioFile, isImageFile, isVideoFile } from "../utils/fileKind";
import { formatBytes } from "../utils/format";
import { createObjectUrlStore } from "../utils/objectUrls";
import { readPlainTextIfPossible, readTextWithEncoding } from "../utils/textReader";
import { codePreview, emptyPreview, htmlPreview, initialPreview, jsonPreview, markdownPreview, mediaPreview, noticePreview, unsupportedPreview } from "../utils/previewFactory";

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
  const preview = reactive(initialPreview());
  const pathLabel = computed(() => (stack.value.length ? `${stack.value.join("/")}/` : "未选择目录"));
  const filteredEntries = computed(() => filterEntries(entries.value, searchKeyword.value));

  if (!window.showDirectoryPicker) {
    Object.assign(preview, noticePreview("当前浏览器不支持本地目录选择。请使用新版 Chrome、Edge 或其他支持 File System Access API 的浏览器打开此页面。"));
  }

  /**
   * 打开本地目录并加载根目录内容。
   * @returns 异步完成信号。
   */
  async function openDirectory(): Promise<void> {
    try {
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
      stack.value.push(item.name);
      searchKeyword.value = "";
      await loadDirectory(item.handle as FileSystemDirectoryHandleLike);
      showEmpty(`当前目录：${item.name}`, "选择文件进行预览，或继续进入子文件夹。");
      return;
    }
    await openFile(item.name, item.handle as FileSystemFileHandleLike);
  }

  /**
   * 打开文件并选择合适的预览器。
   * @param name 文件名。
   * @param handle 文件句柄。
   * @returns 异步完成信号。
   */
  async function openFile(name: string, handle: FileSystemFileHandleLike): Promise<void> {
    const file = await handle.getFile();
    const ext = extensionOf(file.name || name);
    setCurrentFile(file, ext);
    if (await renderKnownFile(file, ext)) return;
    const text = await readPlainTextIfPossible(file);
    if (text) {
      currentText.value = text.text;
      appendFileMeta(`编码 ${text.encoding}`);
      setPreview(codePreview(text.text));
      return;
    }
    setPreview(unsupportedPreview(file, ext));
  }

  /**
   * 写入当前文件基础状态。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 无返回值。
   */
  function setCurrentFile(file: File, ext: string): void {
    urlStore.clear();
    currentFile.value = file;
    currentText.value = "";
    currentFileDirectoryPath.value = stack.value.slice(1);
    fileTitle.value = file.name;
    fileMeta.value = `${formatBytes(file.size)} · ${file.type || fileKindLabel(ext)} · ${new Date(file.lastModified).toLocaleString()}`;
  }

  /**
   * 渲染拥有明确类型的文件。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 是否已完成渲染。
   */
  async function renderKnownFile(file: File, ext: string): Promise<boolean> {
    if (["md", "markdown"].includes(ext)) return renderTextFile(file, markdownPreview);
    if (ext === "txt" || file.type.startsWith("text/plain")) return renderTextFile(file, async text => codePreview(text));
    if (ext === "json" || file.type === "application/json") return renderJsonFile(file);
    if (ext === "html" || ext === "htm" || file.type === "text/html") return renderHtmlFile(file);
    if (isImageFile(file, ext)) return renderMediaFile(file, "image");
    if (isVideoFile(file, ext)) return renderMediaFile(file, "video");
    if (isAudioFile(file, ext)) return renderMediaFile(file, "audio");
    return false;
  }

  /**
   * 渲染普通文本类文件。
   * @param file 当前文件。
   * @param buildPreview 文本预览构造器。
   * @returns 始终返回 true。
   */
  async function renderTextFile(file: File, buildPreview: (text: string) => PreviewState | Promise<PreviewState>): Promise<boolean> {
    const result = await readTextWithEncoding(file);
    currentText.value = result.text;
    appendFileMeta(`编码 ${result.encoding}`);
    setPreview(await buildPreview(result.text));
    return true;
  }

  /**
   * 渲染 JSON 文件。
   * @param file 当前文件。
   * @returns 始终返回 true。
   */
  async function renderJsonFile(file: File): Promise<boolean> {
    const result = await readTextWithEncoding(file);
    appendFileMeta(`编码 ${result.encoding}`);
    const json = jsonPreview(result.text);
    currentText.value = json.currentText;
    if (json.meta) fileMeta.value = json.meta;
    setPreview(json.preview);
    return true;
  }

  /**
   * 渲染 HTML 文件。
   * @param file 当前文件。
   * @returns 始终返回 true。
   */
  async function renderHtmlFile(file: File): Promise<boolean> {
    const result = await readTextWithEncoding(file);
    currentText.value = result.text;
    appendFileMeta(`编码 ${result.encoding}`);
    setPreview(await htmlPreview(result.text, rootHandle.value, currentFileDirectoryPath.value, urlStore.create));
    return true;
  }

  /**
   * 渲染媒体文件。
   * @param file 当前文件。
   * @param kind 媒体类型。
   * @returns 始终返回 true。
   */
  function renderMediaFile(file: File, kind: "image" | "video" | "audio"): boolean {
    setPreview(mediaPreview(file, kind, urlStore.create(file)));
    return true;
  }

  /**
   * 返回上一级目录。
   * @returns 异步完成信号。
   */
  async function goUp(): Promise<void> {
    if (!rootHandle.value || stack.value.length <= 1) return;
    let handle = rootHandle.value;
    for (const name of stack.value.slice(1, -1)) handle = await handle.getDirectoryHandle(name);
    stack.value.pop();
    selectedName.value = "";
    searchKeyword.value = "";
    await loadDirectory(handle);
    showEmpty("已返回上一级", "选择左侧文件进行预览。");
  }

  /**
   * 回到根目录。
   * @returns 异步完成信号。
   */
  async function goHome(): Promise<void> {
    if (!rootHandle.value) return;
    stack.value = [rootHandle.value.name || "本地目录"];
    selectedName.value = "";
    searchKeyword.value = "";
    await loadDirectory(rootHandle.value);
    showEmpty("已回到根目录", "选择左侧文件进行预览。");
  }

  /**
   * 打开当前文件中的本地相对链接。
   * @param rawHref 原始链接。
   * @returns 目标 hash，供视图滚动。
   */
  async function openRelativeDocument(rawHref: string): Promise<string> {
    if (!rootHandle.value) return "";
    const result = await getFileFromRelativePath(rootHandle.value, currentFileDirectoryPath.value, getPathWithoutSuffix(rawHref));
    if (!result) return "";
    stack.value = [rootHandle.value.name || "本地目录", ...result.directoryPath];
    selectedName.value = result.file.name;
    searchKeyword.value = "";
    await loadDirectory(result.directory);
    await openFile(result.file.name, result.handle);
    return getHashSuffix(rawHref);
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
   * 展示空状态并清理当前文件。
   * @param title 标题。
   * @param message 说明。
   * @returns 无返回值。
   */
  function showEmpty(title: string, message: string): void {
    urlStore.clear();
    currentFile.value = null;
    currentText.value = "";
    currentFileDirectoryPath.value = [];
    fileTitle.value = "未打开文件";
    fileMeta.value = "支持 文本、图片、音频和视频";
    setPreview(emptyPreview(title, message));
  }

  /**
   * 展示通知内容。
   * @param message 通知文本。
   * @returns 无返回值。
   */
  function showNotice(message: string): void {
    urlStore.clear();
    setPreview(noticePreview(message));
  }

  /**
   * 在文件元信息末尾追加内容。
   * @param text 追加文本。
   * @returns 无返回值。
   */
  function appendFileMeta(text: string): void {
    fileMeta.value = `${fileMeta.value} · ${text}`;
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
    pathLabel,
    rootHandle,
    currentFileDirectoryPath,
    openDirectory,
    loadDirectory,
    openEntry,
    goUp,
    goHome,
    openRelativeDocument,
    copyCurrentText,
    downloadCurrentFile,
    createObjectUrl: urlStore.create
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
