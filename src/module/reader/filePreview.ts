import { markRaw } from "vue";
import type { FileSystemFileHandleLike, PreviewState } from "../../types";
import { extensionOf, fileKindLabel, isAudioFile, isImageFile, isVideoFile } from "../../utils/fileKind";
import { formatBytes } from "../../utils/format";
import { mediaPreview } from "../../utils/previewFactory";
import { CanceledPreviewLoad, createPreviewLoadSession, type PreviewLoadSession } from "./loadSession";
import type { FilePreviewContext } from "./types";

type WorkerMode = "markdown" | "text" | "json" | "html" | "fallback";

interface WorkerPreviewResult {
  preview: PreviewState;
  currentText: string;
  meta?: string;
  encoding?: string;
  readMs: number;
  processMs: number;
}

/**
 * 创建文件打开和预览操作。
 * @param context 文件预览上下文。
 * @returns 文件打开函数。
 */
export function createFilePreviewActions(context: FilePreviewContext) {
  /**
   * 打开文件并选择合适的预览器。
   * @param name 文件名。
   * @param handle 文件句柄。
   * @returns 异步完成信号。
   */
  async function openFile(name: string, handle: FileSystemFileHandleLike): Promise<void> {
    context.cancelLargeTextConfirm();
    const session = createPreviewLoadSession(context);
    try {
      const file = await session.measureRead(() => handle.getFile());
      const ext = extensionOf(file.name || name);
      if (await renderKnownFile(file, ext, session)) {
        return;
      }
      await renderFallbackText(file, ext, session);
    } catch (error) {
      if (!isCanceledLoad(error)) throw error;
    }
  }

  /**
   * 写入当前文件基础状态。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 无返回值。
   */
  function commitPreview(file: File, ext: string, text: string, preview: PreviewState, meta?: string): void {
    context.currentFile.value = file;
    context.currentText.value = text;
    context.currentFileDirectoryPath.value = context.stack.value.slice(1);
    context.fileTitle.value = file.name;
    context.fileMeta.value = `${formatBytes(file.size)} · ${file.type || fileKindLabel(ext)} · ${new Date(file.lastModified).toLocaleString()}`;
    if (meta) context.fileMeta.value = meta;
    context.setPreview(preview);
  }

  /**
   * 渲染拥有明确类型的文件。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 是否已完成渲染。
   */
  async function renderKnownFile(
    file: File,
    ext: string,
    session: PreviewLoadSession
  ): Promise<boolean> {
    if (["md", "markdown"].includes(ext)) return renderTextFile(file, ext, "markdown", session);
    if (ext === "txt" || file.type.startsWith("text/plain")) return renderTextFile(file, ext, "text", session);
    if (ext === "json" || file.type === "application/json") return renderTextFile(file, ext, "json", session);
    if (ext === "html" || ext === "htm" || file.type === "text/html") return renderTextFile(file, ext, "html", session);
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
  async function renderTextFile(file: File, ext: string, mode: WorkerMode, session: PreviewLoadSession): Promise<boolean> {
    if (!(await session.confirmTextRead(file))) return cancelCurrentFile();
    const result = await session.runWorker<WorkerPreviewResult>(file, mode);
    commitWorkerResult(file, ext, result, session);
    return true;
  }

  /**
   * 渲染媒体文件。
   * @param file 当前文件。
   * @param kind 媒体类型。
   * @returns 始终返回 true。
   */
  function renderMediaFile(file: File, kind: "image" | "video" | "audio"): boolean {
    context.urlStore.clear();
    const preview = mediaPreview(file, kind, context.urlStore.create(file));
    commitPreview(file, extensionOf(file.name), "", preview);
    return true;
  }

  /**
   * 尝试把未知文件按文本预览。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 异步完成信号。
   */
  async function renderFallbackText(file: File, ext: string, session: PreviewLoadSession): Promise<void> {
    if (!(await session.confirmTextRead(file))) {
      cancelCurrentFile();
      return;
    }
    const result = await session.runWorker<WorkerPreviewResult>(file, "fallback");
    commitWorkerResult(file, ext, result, session);
  }

  /**
   * 提交 Worker 完整结果。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @param result Worker 结果。
   * @param session 加载会话。
   * @returns 无返回值。
   */
  function commitWorkerResult(file: File, ext: string, result: WorkerPreviewResult, session: PreviewLoadSession): void {
    session.assertActive();
    session.setTiming(result.readMs, result.processMs);
    context.urlStore.clear();
    const suffixes = [result.meta, result.encoding ? `编码 ${result.encoding}` : ""].filter(Boolean);
    const meta = suffixes.length ? `${baseMeta(file, ext)} · ${suffixes.join(" · ")}` : undefined;
    if (result.preview.kind === "lineText") result.preview.lineText = markRaw(result.preview.lineText);
    commitPreview(file, ext, result.currentText, result.preview, meta);
  }

  /**
   * 取消当前文件预览。
   * @returns 始终返回 true。
   */
  function cancelCurrentFile(): true {
    context.previewTiming.value = { readMs: 0, processMs: 0 };
    return true;
  }

  /**
   * 生成文件基础元信息。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @returns 元信息文本。
   */
  function baseMeta(file: File, ext: string): string {
    return `${formatBytes(file.size)} · ${file.type || fileKindLabel(ext)} · ${new Date(file.lastModified).toLocaleString()}`;
  }

  /**
   * 判断错误是否来自旧加载会话取消。
   * @param error 未知错误。
   * @returns 是否为取消错误。
   */
  function isCanceledLoad(error: unknown): boolean {
    return error instanceof CanceledPreviewLoad || (error instanceof DOMException && error.name === "AbortError");
  }

  return { openFile };
}
