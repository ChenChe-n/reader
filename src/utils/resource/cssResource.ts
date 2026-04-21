import { getFileFromRelativePath, getPathWithoutSuffix, shouldResolveLocalResource } from "../../api/localFiles";
import type { FileSystemDirectoryHandleLike } from "../../types";
import { readTextWithEncoding } from "../textReader";
import { resolveRelativeFileUrl } from "./resolver";
import type { UrlCreator } from "./types";

/**
 * 重写 style 标签和内联样式任务。
 * @param root DOM 根节点。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步任务列表。
 */
export function rewriteStyleNodes(
  root: ParentNode,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Array<Promise<void>> {
  const tags = Array.from(root.querySelectorAll("style")).map(async element => {
    element.textContent = await rewriteCssText(element.textContent || "", rootHandle, basePathParts, createUrl);
  });
  const inline = Array.from(root.querySelectorAll("[style]")).map(async element => {
    const css = await rewriteCssText(element.getAttribute("style") || "", rootHandle, basePathParts, createUrl);
    element.setAttribute("style", css);
  });
  return [...tags, ...inline];
}

/**
 * 重写外链样式表为 Blob 样式表。
 * @param doc HTML 文档。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步完成信号。
 */
export async function rewriteLinkedStylesheets(
  doc: Document,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<void> {
  const tasks = Array.from(doc.querySelectorAll("link[href]")).map(async link => {
    const rel = (link.getAttribute("rel") || "").toLowerCase();
    const href = link.getAttribute("href");
    if (!rel.includes("stylesheet") || !shouldResolveLocalResource(href)) return;
    const result = await getFileFromRelativePath(rootHandle, basePathParts, getPathWithoutSuffix(href || ""));
    if (!result) return;
    const source = (await readTextWithEncoding(result.file)).text;
    const css = await rewriteCssText(source, rootHandle, result.directoryPath, createUrl);
    link.setAttribute("href", createUrl(new Blob([css], { type: "text/css" })));
  });
  await Promise.all(tasks);
}

/**
 * 重写 CSS 文本中的 url() 本地资源。
 * @param cssText CSS 文本。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 重写后的 CSS。
 */
export async function rewriteCssText(
  cssText: string,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<string> {
  const matches = Array.from(cssText.matchAll(/url\(\s*(['"]?)(.*?)\1\s*\)/gi));
  let rewritten = cssText;
  for (const match of matches) {
    const objectUrl = await resolveRelativeFileUrl(rootHandle, basePathParts, match[2], createUrl);
    if (objectUrl) rewritten = rewritten.replace(match[0], `url("${objectUrl}")`);
  }
  return rewritten;
}
