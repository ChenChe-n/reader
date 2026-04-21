import { shouldResolveLocalResource } from "../../api/localFiles";
import type { FileSystemDirectoryHandleLike } from "../../types";
import { resolveRelativeFileUrl } from "./resolver";
import type { UrlCreator } from "./types";

/**
 * 重写 srcset 节点任务。
 * @param root DOM 根节点。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步任务列表。
 */
export function rewriteSrcsetNodes(
  root: ParentNode,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Array<Promise<void>> {
  return Array.from(root.querySelectorAll("img[srcset], source[srcset]")).map(async element => {
    const srcset = await rewriteSrcset(element.getAttribute("srcset"), rootHandle, basePathParts, createUrl);
    if (srcset) element.setAttribute("srcset", srcset);
  });
}

/**
 * 重写 srcset 字符串中的本地资源。
 * @param value srcset 值。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 重写后的 srcset。
 */
async function rewriteSrcset(
  value: string | null,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<string | null> {
  if (!value) return value;
  const parts = value.split(",").map(part => part.trim()).filter(Boolean);
  const rewritten = await Promise.all(parts.map(part => rewriteSrcsetPart(part, rootHandle, basePathParts, createUrl)));
  return rewritten.join(", ");
}

/**
 * 重写单个 srcset 片段。
 * @param part srcset 片段。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 重写后的片段。
 */
async function rewriteSrcsetPart(
  part: string,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<string> {
  const tokens = part.split(/\s+/);
  const url = tokens.shift();
  if (!shouldResolveLocalResource(url)) return part;
  const objectUrl = await resolveRelativeFileUrl(rootHandle, basePathParts, url, createUrl);
  return objectUrl ? [objectUrl, ...tokens].join(" ") : part;
}
