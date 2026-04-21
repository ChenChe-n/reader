/**
 * 创建可统一清理的 object URL 管理器。
 * @returns 创建与清理 URL 的函数集合。
 */
export function createObjectUrlStore() {
  const urls: string[] = [];

  /**
   * 为 Blob 创建 object URL。
   * @param file Blob 或 File 对象。
   * @returns object URL。
   */
  function create(file: Blob): string {
    const url = URL.createObjectURL(file);
    urls.push(url);
    return url;
  }

  /**
   * 清理当前记录的全部 object URL。
   * @returns 无返回值。
   */
  function clear(): void {
    while (urls.length) {
      URL.revokeObjectURL(urls.pop() as string);
    }
  }

  return { create, clear };
}
