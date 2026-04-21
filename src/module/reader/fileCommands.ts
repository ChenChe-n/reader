import type { Ref } from "vue";

/**
 * 复制当前文本内容。
 * @param currentText 当前文本引用。
 * @returns 异步完成信号。
 */
export async function copyCurrentText(currentText: Ref<string>): Promise<void> {
  if (currentText.value) await navigator.clipboard.writeText(currentText.value);
}

/**
 * 下载当前文件。
 * @param currentFile 当前文件引用。
 * @returns 无返回值。
 */
export function downloadCurrentFile(currentFile: Ref<File | null>): void {
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
