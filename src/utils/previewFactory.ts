import type { PreviewState } from "../types";

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
 * 创建媒体预览。
 * @param file 当前文件。
 * @param mediaKind 媒体类型。
 * @param url object URL。
 * @returns 预览状态。
 */
export function mediaPreview(file: File, mediaKind: "image" | "video" | "audio", url: string): PreviewState {
  return { kind: "media", fileName: file.name, mediaKind, url };
}
