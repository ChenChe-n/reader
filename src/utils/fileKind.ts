import type { LocalEntry } from "../types";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif", "apng"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "ogv", "mov", "m4v"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "webm"];

/**
 * 获取文件名后缀的小写形式。
 * @param name 文件名。
 * @returns 后缀，不含点号。
 */
export function extensionOf(name: string): string {
  const index = name.lastIndexOf(".");
  return index >= 0 ? name.slice(index + 1).toLowerCase() : "";
}

/**
 * 获取列表项的图标名称。
 * @param item 文件或目录项。
 * @returns lucide 图标名称。
 */
export function iconFor(item: LocalEntry): string {
  return item.kind === "directory" ? "folder" : iconForExtension(extensionOf(item.name));
}

/**
 * 按后缀获取 lucide 图标名称。
 * @param ext 文件后缀。
 * @returns lucide 图标名称。
 */
export function iconForExtension(ext: string): string {
  if (["md", "markdown"].includes(ext)) return "file-text";
  if (ext === "json") return "braces";
  if (["html", "htm"].includes(ext)) return "file-code-2";
  if (ext === "txt") return "file-type";
  if (IMAGE_EXTENSIONS.includes(ext)) return "image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "file-video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "file-audio";
  if (["zip", "rar", "7z", "tar", "gz"].includes(ext)) return "archive";
  return "file";
}

/**
 * 获取文件列表右侧的元信息。
 * @param item 文件或目录项。
 * @returns 元信息文本。
 */
export function metaFor(item: LocalEntry): string {
  return item.kind === "directory" ? "文件夹" : extensionOf(item.name).toUpperCase() || "文件";
}

/**
 * 获取文件类型的英文标签。
 * @param ext 文件后缀。
 * @returns 类型标签。
 */
export function fileKindLabel(ext: string): string {
  const labels: Record<string, string> = {
    md: "Markdown",
    markdown: "Markdown",
    txt: "Text",
    json: "JSON",
    html: "HTML",
    htm: "HTML"
  };
  if (IMAGE_EXTENSIONS.includes(ext)) return "Image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "Video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "Audio";
  return labels[ext] || "File";
}

/**
 * 判断文件是否是图片。
 * @param file 浏览器 File 对象。
 * @param ext 文件后缀。
 * @returns 是否为图片。
 */
export function isImageFile(file: File, ext: string): boolean {
  return file.type.startsWith("image/") || IMAGE_EXTENSIONS.includes(ext);
}

/**
 * 判断文件是否是视频。
 * @param file 浏览器 File 对象。
 * @param ext 文件后缀。
 * @returns 是否为视频。
 */
export function isVideoFile(file: File, ext: string): boolean {
  return file.type.startsWith("video/") || VIDEO_EXTENSIONS.includes(ext);
}

/**
 * 判断文件是否是音频。
 * @param file 浏览器 File 对象。
 * @param ext 文件后缀。
 * @returns 是否为音频。
 */
export function isAudioFile(file: File, ext: string): boolean {
  return file.type.startsWith("audio/") || AUDIO_EXTENSIONS.includes(ext);
}
