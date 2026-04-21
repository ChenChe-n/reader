import type { FileSystemDirectoryHandleLike } from "../../types";
import { rewriteLinkedStylesheets } from "./cssResource";
import { rewriteRelativeResources } from "./domResource";
import type { UrlCreator } from "./types";

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
