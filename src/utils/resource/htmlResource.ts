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
  if (canUseStaticHtmlFastPath(text)) return ensureDoctype(text);
  const doc = new DOMParser().parseFromString(text, "text/html");
  removeExecutableContent(doc);
  if (!rootHandle) return `<!doctype html>\n${doc.documentElement.outerHTML}`;
  await rewriteLinkedStylesheets(doc, rootHandle, basePathParts, createUrl);
  await rewriteRelativeResources(doc, rootHandle, basePathParts, createUrl);
  injectHtmlNavigationBridge(doc);
  return `<!doctype html>\n${doc.documentElement.outerHTML}`;
}

/**
 * 判断 HTML 是否可以跳过 DOM 解析和资源重写。
 * @param text HTML 源码。
 * @returns 是否可直接交给 iframe 渲染。
 */
function canUseStaticHtmlFastPath(text: string): boolean {
  if (/<script\b/i.test(text)) return false;
  if (/\s+on[a-z]+\s*=/i.test(text)) return false;
  if (/javascript\s*:/i.test(text)) return false;
  if (/\b(?:src|href|srcset|data|poster|action)\s*=/i.test(text)) return false;
  if (/\burl\(\s*['"]?(?!data:|blob:|https?:|\/\/|#)/i.test(text)) return false;
  return true;
}

/**
 * 确保交给 iframe 的字符串是完整 HTML 文档。
 * @param text HTML 源码。
 * @returns 带 doctype 的 HTML。
 */
function ensureDoctype(text: string): string {
  return /^\s*<!doctype\b/i.test(text) ? text : `<!doctype html>\n${text}`;
}

/**
 * 移除用户 HTML 中会执行脚本或触发脚本加载的内容。
 * @param doc HTML 文档。
 * @returns 无返回值。
 */
function removeExecutableContent(doc: Document): void {
  doc.querySelectorAll("script").forEach(element => element.remove());
  doc.querySelectorAll("*").forEach(element => {
    for (const attribute of Array.from(element.attributes)) {
      const name = attribute.name.toLowerCase();
      const value = attribute.value.trim();
      if (name.startsWith("on") || value.toLowerCase().startsWith("javascript:")) {
        element.removeAttribute(attribute.name);
      }
    }
  });
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
