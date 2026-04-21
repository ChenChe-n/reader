import { getFileFromRelativePath, getPathWithoutSuffix, shouldResolveLocalResource } from "../../api/localFiles";
import type { FileSystemDirectoryHandleLike } from "../../types";
import type { UrlCreator } from "./types";

/**
 * 将相对资源解析成 object URL。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param rawPath 原始资源路径。
 * @param createUrl object URL 创建函数。
 * @returns object URL 或 null。
 */
export async function resolveRelativeFileUrl(
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  rawPath: string | null | undefined,
  createUrl: UrlCreator
): Promise<string | null> {
  try {
    if (!shouldResolveLocalResource(rawPath)) return null;
    const purePath = getPathWithoutSuffix(rawPath || "");
    const result = await getFileFromRelativePath(rootHandle, basePathParts, purePath);
    return result ? createUrl(result.file) : null;
  } catch {
    return null;
  }
}
