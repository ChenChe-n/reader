import { shouldResolveLocalResource } from "../../api/localFiles";
import type { FileSystemDirectoryHandleLike } from "../../types";
import { rewriteStyleNodes } from "./cssResource";
import { resolveRelativeFileUrl } from "./resolver";
import { rewriteSrcsetNodes } from "./srcsetResource";
import type { UrlCreator } from "./types";

/**
 * 重写 DOM 内的本地相对资源为 object URL。
 * @param root 需要处理的 DOM 根节点。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前文件所在路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步完成信号。
 */
export async function rewriteRelativeResources(
  root: ParentNode,
  rootHandle: FileSystemDirectoryHandleLike | null,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<void> {
  if (!rootHandle) return;
  const tasks = resourceSelectors().flatMap(([selector, attr]) => {
    return Array.from(root.querySelectorAll(selector)).map(element => rewriteElementAttr(element, attr, rootHandle, basePathParts, createUrl));
  });
  tasks.push(...rewriteSrcsetNodes(root, rootHandle, basePathParts, createUrl));
  tasks.push(...rewriteStyleNodes(root, rootHandle, basePathParts, createUrl));
  await Promise.all(tasks);
}

/**
 * 重写单个元素的资源属性。
 * @param element DOM 元素。
 * @param attr 资源属性名。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步完成信号。
 */
async function rewriteElementAttr(
  element: Element,
  attr: string,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<void> {
  const value = element.getAttribute(attr);
  if (!shouldResolveLocalResource(value)) return;
  const url = await resolveRelativeFileUrl(rootHandle, basePathParts, value, createUrl);
  if (url) element.setAttribute(attr, url);
}

/**
 * 生成需要重写的资源选择器表。
 * @returns 选择器和属性名列表。
 */
function resourceSelectors(): Array<[string, string]> {
  return [
    ["img[src]", "src"],
    ["video[src]", "src"],
    ["audio[src]", "src"],
    ["source[src]", "src"],
    ["track[src]", "src"],
    ["script[src]", "src"],
    ["iframe[src]", "src"],
    ["embed[src]", "src"],
    ["object[data]", "data"],
    ["link[href]", "href"]
  ];
}
