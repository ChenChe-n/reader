import { markRaw } from "vue";
import type { FileSystemFileHandleLike, PreviewState, TextPreviewWorkerMode } from "../../types";
import { fileKindLabel } from "../../utils/fileKind";
import { formatBytes } from "../../utils/format";
import { CanceledPreviewLoad, type PreviewLoadSession } from "./loadSession";
import type { FilePreviewContext } from "./types";

export interface WorkerPreviewResult {
  preview: PreviewState;
  currentText: string;
  meta?: string;
  encoding?: string;
  readMs: number;
  processMs: number;
}

/**
 * 写入当前文件基础状态。
 * @param context 文件预览上下文。
 * @param file 当前文件。
 * @param ext 文件后缀。
 * @param text 当前文本。
 * @param preview 预览状态。
 * @param meta 可选元信息覆盖。
 * @param fileHandle 文件句柄。
 * @param workerMode 文本 Worker 模式，媒体等非文本为 null。
 * @returns 无返回值。
 */
export function commitPreview(
  context: FilePreviewContext,
  file: File,
  ext: string,
  text: string,
  preview: PreviewState,
  meta: string | undefined,
  fileHandle: FileSystemFileHandleLike | null,
  workerMode: TextPreviewWorkerMode | null
): void {
  context.currentFile.value = file;
  context.currentText.value = text;
  context.currentFileHandle.value = fileHandle;
  context.lastWorkerMode.value = workerMode;
  context.currentFileDirectoryPath.value = context.stack.value.slice(1);
  context.fileTitle.value = file.name;
  context.fileMeta.value = baseMeta(file, ext);
  if (meta) context.fileMeta.value = meta;
  context.setPreview(preview);
}

/**
 * 提交 Worker 完整结果。
 * @param context 文件预览上下文。
 * @param file 当前文件。
 * @param ext 文件后缀。
 * @param result Worker 结果。
 * @param session 加载会话。
 * @param fileHandle 文件句柄。
 * @param workerMode Worker 模式。
 * @returns 无返回值。
 */
export function commitWorkerResult(
  context: FilePreviewContext,
  file: File,
  ext: string,
  result: WorkerPreviewResult,
  session: PreviewLoadSession,
  fileHandle: FileSystemFileHandleLike,
  workerMode: TextPreviewWorkerMode
): void {
  session.assertActive();
  session.setTiming(result.readMs, result.processMs);
  context.urlStore.clear();
  const suffixes = [result.meta, result.encoding ? `编码 ${result.encoding}` : ""].filter(Boolean);
  const meta = suffixes.length ? `${baseMeta(file, ext)} · ${suffixes.join(" · ")}` : undefined;
  if (result.preview.kind === "lineText") result.preview.lineText = markRaw(result.preview.lineText);
  commitPreview(context, file, ext, result.currentText, result.preview, meta, fileHandle, workerMode);
}

/**
 * 生成文件基础元信息。
 * @param file 当前文件。
 * @param ext 文件后缀。
 * @returns 元信息文本。
 */
export function baseMeta(file: File, ext: string): string {
  return `${formatBytes(file.size)} · ${file.type || fileKindLabel(ext)} · ${new Date(file.lastModified).toLocaleString()}`;
}

/**
 * 判断错误是否来自旧加载会话取消。
 * @param error 未知错误。
 * @returns 是否为取消错误。
 */
export function isCanceledLoad(error: unknown): boolean {
  return error instanceof CanceledPreviewLoad || (error instanceof DOMException && error.name === "AbortError");
}
