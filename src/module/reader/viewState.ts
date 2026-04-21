import { emptyPreview, noticePreview } from "../../utils/previewFactory";
import type { ReaderViewContext } from "./types";

/**
 * 创建阅读器视图状态操作。
 * @param context 阅读器视图上下文。
 * @returns 空状态、通知状态和元信息操作。
 */
export function createViewStateActions(context: ReaderViewContext) {
  /**
   * 展示空状态并清理当前文件。
   * @param title 标题。
   * @param message 说明。
   * @returns 无返回值。
   */
  function showEmpty(title: string, message: string): void {
    if (context.loadVersion) context.loadVersion.value += 1;
    context.loadAbortController?.value?.abort();
    if (context.loadAbortController) context.loadAbortController.value = null;
    context.loadWorker?.value?.terminate();
    if (context.loadWorker) context.loadWorker.value = null;
    context.urlStore.clear();
    context.currentFile.value = null;
    context.currentText.value = "";
    context.currentFileDirectoryPath.value = [];
    context.fileTitle.value = "未打开文件";
    context.fileMeta.value = "支持 文本、图片、音频和视频";
    context.previewTiming.value = { readMs: 0, processMs: 0 };
    context.setPreview(emptyPreview(title, message));
  }

  /**
   * 展示通知内容。
   * @param message 通知文本。
   * @returns 无返回值。
   */
  function showNotice(message: string): void {
    if (context.loadVersion) context.loadVersion.value += 1;
    context.loadAbortController?.value?.abort();
    if (context.loadAbortController) context.loadAbortController.value = null;
    context.loadWorker?.value?.terminate();
    if (context.loadWorker) context.loadWorker.value = null;
    context.urlStore.clear();
    context.previewTiming.value = { readMs: 0, processMs: 0 };
    context.setPreview(noticePreview(message));
  }

  /**
   * 在文件元信息末尾追加内容。
   * @param text 追加文本。
   * @returns 无返回值。
   */
  function appendFileMeta(text: string): void {
    context.fileMeta.value = `${context.fileMeta.value} · ${text}`;
  }

  return { showEmpty, showNotice, appendFileMeta };
}
