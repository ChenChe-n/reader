import { getFileFromRelativePath, getPathWithoutSuffix, shouldResolveLocalResource } from "../api/localFiles";
import type { FileSystemDirectoryHandleLike } from "../types";
import { readTextWithEncoding } from "./textReader";

type UrlCreator = (file: Blob) => string;

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
    return Array.from(root.querySelectorAll(selector)).map(async element => {
      const value = element.getAttribute(attr);
      const url = await resolveRelativeFileUrl(rootHandle, basePathParts, value, createUrl);
      if (url) element.setAttribute(attr, url);
    });
  });

  tasks.push(...rewriteSrcsetNodes(root, rootHandle, basePathParts, createUrl));
  tasks.push(...rewriteStyleNodes(root, rootHandle, basePathParts, createUrl));
  await Promise.all(tasks);
}

/**
 * 重写完整 HTML 文档中的本地相对资源。
 * @param text HTML 源码。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前文件所在路径。
 * @param createUrl object URL 创建函数。
 * @returns 可放入 iframe.srcdoc 的 HTML。
 */
export async function rewriteHtmlRelativeResources(
  text: string,
  rootHandle: FileSystemDirectoryHandleLike | null,
  basePathParts: string[],
  createUrl: UrlCreator
): Promise<string> {
  if (!rootHandle) return text;
  const doc = new DOMParser().parseFromString(text, "text/html");
  await rewriteLinkedStylesheets(doc, rootHandle, basePathParts, createUrl);
  await rewriteRelativeResources(doc, rootHandle, basePathParts, createUrl);
  injectHtmlNavigationBridge(doc);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

/**
 * 给 HTML 预览注入相对链接导航桥。
 * @param doc HTML 文档。
 * @returns 无返回值。
 */
function injectHtmlNavigationBridge(doc: Document): void {
  const script = doc.createElement("script");
  script.textContent = `
    document.addEventListener("click", function(event) {
      var link = event.target && event.target.closest ? event.target.closest("a[href]") : null;
      if (!link) return;
      var href = link.getAttribute("href");
      if (!href || href.charAt(0) === "#") return;
      if (/^(?:[a-z][a-z0-9+.-]*:|\\/\\/)/i.test(href)) return;
      event.preventDefault();
      parent.postMessage({ type: "reader:navigate", href: href }, "*");
    }, true);
  `;
  (doc.body || doc.documentElement).appendChild(script);
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

/**
 * 重写 srcset 节点任务。
 * @param root DOM 根节点。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步任务列表。
 */
function rewriteSrcsetNodes(
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
 * 重写 style 标签和内联样式任务。
 * @param root DOM 根节点。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 异步任务列表。
 */
function rewriteStyleNodes(
  root: ParentNode,
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  createUrl: UrlCreator
): Array<Promise<void>> {
  const tags = Array.from(root.querySelectorAll("style")).map(async element => {
    element.textContent = await rewriteCssText(element.textContent || "", rootHandle, basePathParts, createUrl);
  });
  const inline = Array.from(root.querySelectorAll("[style]")).map(async element => {
    element.setAttribute("style", await rewriteCssText(element.getAttribute("style") || "", rootHandle, basePathParts, createUrl));
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
async function rewriteLinkedStylesheets(
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
    const css = await rewriteCssText((await readTextWithEncoding(result.file)).text, rootHandle, result.directoryPath, createUrl);
    link.setAttribute("href", createUrl(new Blob([css], { type: "text/css" })));
  });
  await Promise.all(tasks);
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
  const rewritten = await Promise.all(value.split(",").map(part => rewriteSrcsetPart(part.trim(), rootHandle, basePathParts, createUrl)));
  return rewritten.filter(Boolean).join(", ");
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

/**
 * 重写 CSS 文本中的 url() 本地资源。
 * @param cssText CSS 文本。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param createUrl object URL 创建函数。
 * @returns 重写后的 CSS。
 */
async function rewriteCssText(
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

/**
 * 将相对资源解析成 object URL。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前路径。
 * @param rawPath 原始资源路径。
 * @param createUrl object URL 创建函数。
 * @returns object URL 或 null。
 */
async function resolveRelativeFileUrl(
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  rawPath: string | null | undefined,
  createUrl: UrlCreator
): Promise<string | null> {
  try {
    if (!shouldResolveLocalResource(rawPath)) return null;
    const result = await getFileFromRelativePath(rootHandle, basePathParts, getPathWithoutSuffix(rawPath || ""));
    return result ? createUrl(result.file) : null;
  } catch {
    return null;
  }
}
