/**
 * 将字节数格式化为更适合界面展示的容量字符串。
 * @param bytes 原始字节数。
 * @returns 带单位的容量文本。
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  return `${(bytes / Math.pow(1024, index)).toFixed(index ? 1 : 0)} ${units[index]}`;
}

/**
 * 转义 HTML 文本，供字符串模板中的用户文件名安全显示。
 * @param value 需要转义的任意值。
 * @returns 已转义的 HTML 字符串。
 */
export function escapeHtml(value: unknown): string {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
