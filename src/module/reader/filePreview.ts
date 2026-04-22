import { markRaw } from "vue";
import type { FileSystemFileHandleLike, TextPreviewWorkerMode } from "../../types";
import { extensionOf, isAudioFile, isImageFile, isVideoFile } from "../../utils/fileKind";
import { mediaPreview } from "../../utils/previewFactory";
import { createPreviewLoadSession, runPreviewWorkerDetached, type PreviewLoadSession } from "./loadSession";
import { baseMeta, commitPreview, commitWorkerResult, isCanceledLoad, type WorkerPreviewResult } from "./filePreviewCommit";
import { buildRichPreview, isRichPreviewFile } from "./richPreview";
import type { FilePreviewContext } from "./types";

/**
 * 创建文件打开和预览操作。
 * @param context 文件预览上下文。
 * @returns 文件打开与保存方法。
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
      if (await renderKnownFile(file, ext, session, handle)) {
        return;
      }
      await renderFallbackText(file, ext, session, handle);
    } catch (error) {
      if (!isCanceledLoad(error)) throw error;
    }
  }

  /**
   * 将文本写回当前文件并刷新预览。
   * @param text 待写入全文（UTF-8）。
   * @returns 异步完成信号。
   */
  async function saveTextAndRefresh(text: string): Promise<void> {
    const handle = context.currentFileHandle.value;
    const mode = context.lastWorkerMode.value;
    if (!handle?.createWritable || !mode) {
      throw new Error("当前文件无法保存（缺少写权限或不是可编辑文本预览）。");
    }
    const writable = await handle.createWritable();
    await writable.write(new Blob([text], { type: "text/plain;charset=utf-8" }));
    await writable.close();
    const file = await handle.getFile();
    const ext = extensionOf(file.name);
    const result = await runPreviewWorkerDetached(file, mode);
    context.urlStore.clear();
    const suffixes = [result.meta, result.encoding ? `编码 ${result.encoding}` : ""].filter(Boolean);
    const meta = suffixes.length ? `${baseMeta(file, ext)} · ${suffixes.join(" · ")}` : undefined;
    if (result.preview.kind === "lineText") result.preview.lineText = markRaw(result.preview.lineText);
    context.previewTiming.value = { readMs: result.readMs, processMs: result.processMs };
    commitPreview(context, file, ext, result.currentText, result.preview, meta, handle, mode);
  }

  /**
   * 渲染拥有明确类型的文件。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @param session 加载会话。
   * @param fileHandle 文件句柄。
   * @returns 是否已完成渲染。
   */
  async function renderKnownFile(
    file: File,
    ext: string,
    session: PreviewLoadSession,
    fileHandle: FileSystemFileHandleLike
  ): Promise<boolean> {
    if (["md", "markdown"].includes(ext)) return renderTextFile(file, ext, "markdown", session, fileHandle);
    if (isRichPreviewFile(ext)) return renderRichFile(file, ext, session, fileHandle);
    if (ext === "txt" || file.type.startsWith("text/plain")) return renderTextFile(file, ext, "text", session, fileHandle);
    if (ext === "json" || file.type === "application/json") return renderTextFile(file, ext, "json", session, fileHandle);
    if (ext === "vue") return renderTextFile(file, ext, "vue", session, fileHandle);
    if (ext === "css" || ext === "scss" || ext === "less") return renderTextFile(file, ext, "css", session, fileHandle);
    if (["ts", "tsx"].includes(ext)) return renderTextFile(file, ext, "typescript", session, fileHandle);
    if (["js", "jsx", "mjs", "cjs"].includes(ext)) return renderTextFile(file, ext, "javascript", session, fileHandle);
    if (["py", "pyw"].includes(ext)) return renderTextFile(file, ext, "python", session, fileHandle);
    if (["c", "h"].includes(ext)) return renderTextFile(file, ext, "c", session, fileHandle);
    if (["cpp", "cxx", "cc", "hpp", "hxx", "hh"].includes(ext)) return renderTextFile(file, ext, "cpp", session, fileHandle);
    if (ext === "rs") return renderTextFile(file, ext, "rust", session, fileHandle);
    if (ext === "java") return renderTextFile(file, ext, "java", session, fileHandle);
    if (["sh", "bash", "zsh", "ps1"].includes(ext)) return renderTextFile(file, ext, "shell", session, fileHandle);
    if (ext === "html" || ext === "htm" || file.type === "text/html") {
      return renderTextFile(file, ext, context.htmlPreviewMode.value === "code" ? "html-code" : "html", session, fileHandle);
    }
    if (isImageFile(file, ext)) return renderMediaFile(file, "image", fileHandle);
    if (isVideoFile(file, ext)) return renderMediaFile(file, "video", fileHandle);
    if (isAudioFile(file, ext)) return renderMediaFile(file, "audio", fileHandle);
    return false;
  }

  /**
   * 渲染普通文本类文件。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @param mode Worker 模式。
   * @param session 加载会话。
   * @param fileHandle 文件句柄。
   * @returns 始终返回 true。
   */
  async function renderTextFile(
    file: File,
    ext: string,
    mode: TextPreviewWorkerMode,
    session: PreviewLoadSession,
    fileHandle: FileSystemFileHandleLike
  ): Promise<boolean> {
    if (!(await session.confirmTextRead(file))) return cancelCurrentFile();
    const result = await session.runWorker<WorkerPreviewResult>(file, mode);
    commitWorkerResult(context, file, ext, result, session, fileHandle, mode);
    return true;
  }

  /**
   * 渲染媒体文件。
   * @param file 当前文件。
   * @param kind 媒体类型。
   * @param fileHandle 文件句柄。
   * @returns 始终返回 true。
   */
  function renderMediaFile(file: File, kind: "image" | "video" | "audio", fileHandle: FileSystemFileHandleLike): boolean {
    context.urlStore.clear();
    const preview = mediaPreview(file, kind, context.urlStore.create(file));
    commitPreview(context, file, extensionOf(file.name), "", preview, undefined, fileHandle, null);
    return true;
  }

  /**
   * 渲染富文档只读预览。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @param session 加载会话。
   * @param fileHandle 文件句柄。
   * @returns 始终返回 true。
   */
  async function renderRichFile(
    file: File,
    ext: string,
    session: PreviewLoadSession,
    fileHandle: FileSystemFileHandleLike
  ): Promise<boolean> {
    context.urlStore.clear();
    const result = await buildRichPreview(file, ext, context.urlStore.create);
    session.assertActive();
    session.setTiming(result.readMs, result.processMs);
    const meta = `${baseMeta(file, ext)} · ${result.meta}`;
    commitPreview(context, file, ext, result.currentText, result.preview, meta, fileHandle, null);
    return true;
  }

  /**
   * 尝试把未知文件按文本预览。
   * @param file 当前文件。
   * @param ext 文件后缀。
   * @param session 加载会话。
   * @param fileHandle 文件句柄。
   * @returns 异步完成信号。
   */
  async function renderFallbackText(
    file: File,
    ext: string,
    session: PreviewLoadSession,
    fileHandle: FileSystemFileHandleLike
  ): Promise<void> {
    if (!(await session.confirmTextRead(file))) {
      cancelCurrentFile();
      return;
    }
    const result = await session.runWorker<WorkerPreviewResult>(file, "fallback");
    commitWorkerResult(context, file, ext, result, session, fileHandle, "fallback");
  }

  /**
   * 取消当前文件预览。
   * @returns 始终返回 true。
   */
  function cancelCurrentFile(): true {
    context.previewTiming.value = { readMs: 0, processMs: 0 };
    return true;
  }

  return { openFile, saveTextAndRefresh };
}
