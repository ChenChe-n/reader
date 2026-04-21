import type { FileSystemFileHandleLike, PreviewState } from "../../types";
import { extensionOf, fileKindLabel, isAudioFile, isImageFile, isVideoFile } from "../../utils/fileKind";
import { formatBytes } from "../../utils/format";
import { readPlainTextIfPossible, readTextWithEncoding } from "../../utils/textReader";
import { codePreview, htmlPreview, jsonPreview, markdownPreview, mediaPreview, unsupportedPreview } from "../../utils/previewFactory";
import { createViewStateActions } from "./viewState";
import type { FilePreviewContext } from "./types";

/**
 * 创建文件打开和预览操作。
 * @param context 文件预览上下文。
 * @returns 文件打开函数。
 */
export function createFilePreviewActions(context: FilePreviewContext) {
  const { appendFileMeta } = createViewStateActions(context);

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
    await renderFallbackText(file, ext);
  }

  /**
   * 写入当前文件基础状态。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 无返回值。
   */
  function setCurrentFile(file: File, ext: string): void {
    context.urlStore.clear();
    context.currentFile.value = file;
    context.currentText.value = "";
    context.currentFileDirectoryPath.value = context.stack.value.slice(1);
    context.fileTitle.value = file.name;
    context.fileMeta.value = `${formatBytes(file.size)} · ${file.type || fileKindLabel(ext)} · ${new Date(file.lastModified).toLocaleString()}`;
  }

  /**
   * 渲染拥有明确类型的文件。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 是否已完成渲染。
   */
  async function renderKnownFile(file: File, ext: string): Promise<boolean> {
    if (["md", "markdown"].includes(ext)) return renderTextFile(file, markdownPreview);
    if (ext === "txt" || file.type.startsWith("text/plain")) return renderTextFile(file, text => codePreview(text));
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
    context.currentText.value = result.text;
    appendFileMeta(`编码 ${result.encoding}`);
    context.setPreview(await buildPreview(result.text));
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
    context.currentText.value = json.currentText;
    if (json.meta) context.fileMeta.value = json.meta;
    context.setPreview(json.preview);
    return true;
  }

  /**
   * 渲染 HTML 文件。
   * @param file 当前文件。
   * @returns 始终返回 true。
   */
  async function renderHtmlFile(file: File): Promise<boolean> {
    const result = await readTextWithEncoding(file);
    context.currentText.value = result.text;
    appendFileMeta(`编码 ${result.encoding}`);
    const preview = await htmlPreview(result.text, context.rootHandle.value, context.currentFileDirectoryPath.value, context.urlStore.create);
    context.setPreview(preview);
    return true;
  }

  /**
   * 渲染媒体文件。
   * @param file 当前文件。
   * @param kind 媒体类型。
   * @returns 始终返回 true。
   */
  function renderMediaFile(file: File, kind: "image" | "video" | "audio"): boolean {
    context.setPreview(mediaPreview(file, kind, context.urlStore.create(file)));
    return true;
  }

  /**
   * 尝试把未知文件按文本预览。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 异步完成信号。
   */
  async function renderFallbackText(file: File, ext: string): Promise<void> {
    const text = await readPlainTextIfPossible(file);
    if (!text) {
      context.setPreview(unsupportedPreview(file, ext));
      return;
    }
    context.currentText.value = text.text;
    appendFileMeta(`编码 ${text.encoding}`);
    context.setPreview(codePreview(text.text));
  }

  return { openFile };
}
