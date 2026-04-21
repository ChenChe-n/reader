import DOMPurify from "dompurify";
import { marked } from "marked";
import type { PreviewState } from "../types";
import { rewriteHtmlRelativeResources } from "./resourceRewriter";
import { escapeHtml } from "./format";
import { iconForExtension } from "./fileKind";

marked.setOptions({ gfm: true, breaks: false });

/**
 * 创建初始空状态预览。
 * @returns 预览状态。
 */
export function initialPreview(): PreviewState {
  return {
    kind: "empty",
    title: "打开一个目录开始阅读",
    message: "浏览器会请求本地目录权限。选择后可以浏览文件夹，并预览文档、图片、音频、视频和可解码文本。"
  };
}

/**
 * 创建空状态预览。
 * @param title 标题。
 * @param message 说明。
 * @returns 预览状态。
 */
export function emptyPreview(title: string, message: string): PreviewState {
  return { kind: "empty", title, message };
}

/**
 * 创建通知预览。
 * @param message 通知文本。
 * @returns 预览状态。
 */
export function noticePreview(message: string): PreviewState {
  return { kind: "notice", message };
}

/**
 * 创建 Markdown 预览。
 * @param text Markdown 源码。
 * @returns 预览状态。
 */
export async function markdownPreview(text: string): Promise<PreviewState> {
  const html = DOMPurify.sanitize(await marked.parse(text), { ADD_ATTR: ["target", "rel"] });
  return { kind: "markdown", html };
}

/**
 * 创建代码预览。
 * @param text 源码或纯文本。
 * @returns 预览状态。
 */
export function codePreview(text: string): PreviewState {
  return { kind: "code", text };
}

/**
 * 创建 JSON 预览。
 * @param text JSON 或普通文本。
 * @returns 预览状态和元信息覆盖。
 */
export function jsonPreview(text: string): { preview: PreviewState; meta?: string; currentText: string } {
  try {
    const formatted = JSON.stringify(JSON.parse(text), null, 2);
    return { preview: codePreview(formatted), currentText: formatted };
  } catch {
    return { preview: codePreview(text), currentText: text, meta: "JSON 解析失败，已按纯文本显示" };
  }
}

/**
 * 创建 HTML iframe 预览。
 * @param text HTML 源码。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前文件路径。
 * @param createUrl object URL 创建函数。
 * @returns 预览状态。
 */
export async function htmlPreview(
  text: string,
  rootHandle: Parameters<typeof rewriteHtmlRelativeResources>[1],
  basePathParts: string[],
  createUrl: Parameters<typeof rewriteHtmlRelativeResources>[3]
): Promise<PreviewState> {
  const html = await rewriteHtmlRelativeResources(text, rootHandle, basePathParts, createUrl);
  return { kind: "html", html };
}

/**
 * 创建媒体预览。
 * @param file 当前文件。
 * @param mediaKind 媒体类型。
 * @param url object URL。
 * @returns 预览状态。
 */
export function mediaPreview(file: File, mediaKind: "image" | "video" | "audio", url: string): PreviewState {
  return { kind: "media", fileName: file.name, mediaKind, url };
}

/**
 * 创建无法预览状态。
 * @param file 当前文件。
 * @param ext 文件后缀。
 * @returns 预览状态。
 */
export function unsupportedPreview(file: File, ext: string): PreviewState {
  return {
    kind: "empty",
    title: "无法预览此文件",
    message: `${escapeHtml(file.name)} · ${file.size} bytes`,
    html: iconForExtension(ext)
  };
}
