import { ref } from "vue";

const LARGE_TEXT_LIMIT = 1024 * 1024;

export interface ConfirmDialogState {
  visible: boolean;
  title: string;
  message: string;
  resolve: ((confirmed: boolean) => void) | null;
}

/**
 * 创建大文本读取确认框状态。
 * @returns 确认框状态和操作。
 */
export function createLargeTextConfirm() {
  const confirmDialog = ref<ConfirmDialogState>(emptyConfirmState());

  /**
   * 为超大文本文件请求读取确认。
   * @param file 待读取文件。
   * @returns 是否继续读取。
   */
  function confirmLargeText(file: File): Promise<boolean> {
    if (file.size <= LARGE_TEXT_LIMIT) return Promise.resolve(true);
    cancelLargeTextConfirm();
    return new Promise(resolve => {
      confirmDialog.value = {
        visible: true,
        title: "读取大文件",
        message: `${file.name} 大小为 ${formatMegabytes(file.size)}，读取和处理可能需要一些时间。是否继续预览？`,
        resolve
      };
    });
  }

  /**
   * 完成当前确认框。
   * @param confirmed 是否确认。
   * @returns 无返回值。
   */
  function resolveConfirmDialog(confirmed: boolean): void {
    confirmDialog.value.resolve?.(confirmed);
    confirmDialog.value = emptyConfirmState();
  }

  /**
   * 取消当前大文件确认。
   * @returns 无返回值。
   */
  function cancelLargeTextConfirm(): void {
    if (!confirmDialog.value.visible) return;
    resolveConfirmDialog(false);
  }

  return { confirmDialog, confirmLargeText, resolveConfirmDialog, cancelLargeTextConfirm };
}

/**
 * 创建空确认状态。
 * @returns 空确认状态。
 */
function emptyConfirmState(): ConfirmDialogState {
  return {
    visible: false,
    title: "",
    message: "",
    resolve: null
  };
}

/**
 * 格式化 MB 文件大小。
 * @param bytes 原始字节数。
 * @returns MB 文本。
 */
function formatMegabytes(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}
