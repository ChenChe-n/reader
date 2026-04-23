import type { LocalEntry, ReaderIconName } from "../types";

const IMAGE_EXTENSIONS = ["png", "jpg", "jpeg", "gif", "webp", "svg", "bmp", "ico", "avif", "apng"];
const VIDEO_EXTENSIONS = ["mp4", "webm", "ogg", "ogv", "mov", "m4v"];
const AUDIO_EXTENSIONS = ["mp3", "wav", "ogg", "oga", "m4a", "aac", "flac", "opus", "webm"];
const ARCHIVE_EXTENSIONS = [
  "zip",
  "rar",
  "7z",
  "tar",
  "tgz",
  "gz",
  "cbz",
  "cbr",
  "cb7",
  "cbt",
  "xz",
  "txz",
  "bz2",
  "tbz2",
  "zst",
  "tzst",
  "cab",
  "iso"
];

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
 * @returns 项目内部图标名称。
 */
export function iconFor(item: LocalEntry): ReaderIconName {
  return item.kind === "directory" ? "dir-default" : iconForExtension(extensionOf(item.name));
}

/**
 * 按后缀获取项目内部图标名称。
 * @param ext 文件后缀。
 * @returns 项目内部图标名称。
 */
export function iconForExtension(ext: string): ReaderIconName {
  if (["md", "markdown"].includes(ext)) return "file-text";
  if (ext === "json") return "file-json";
  if (CODE_EXTENSIONS.includes(ext)) return "file-code";
  if (ext === "txt") return "file-plain";
  if (["pdf", "xlsx", "xls", "csv", "doc", "docx", "psd"].includes(ext)) return "file-text";
  if (IMAGE_EXTENSIONS.includes(ext)) return "file-image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "file-video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "file-audio";
  if (ARCHIVE_EXTENSIONS.includes(ext)) return "file-archive";
  return "file-default";
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
    htm: "HTML",
    vue: "Vue",
    css: "CSS",
    scss: "SCSS",
    less: "Less",
    ts: "TypeScript",
    tsx: "TypeScript",
    js: "JavaScript",
    jsx: "JavaScript",
    mjs: "JavaScript",
    cjs: "JavaScript",
    py: "Python",
    pyw: "Python",
    c: "C",
    h: "C Header",
    cpp: "C++",
    cxx: "C++",
    cc: "C++",
    hpp: "C++ Header",
    hxx: "C++ Header",
    hh: "C++ Header",
    rs: "Rust",
    java: "Java",
    sh: "Shell",
    bash: "Shell",
    zsh: "Shell",
    ps1: "PowerShell",
    pdf: "PDF",
    xlsx: "Excel",
    xls: "Excel",
    csv: "CSV",
    doc: "Word",
    docx: "Word",
    psd: "PSD"
  };
  if (IMAGE_EXTENSIONS.includes(ext)) return "Image";
  if (VIDEO_EXTENSIONS.includes(ext)) return "Video";
  if (AUDIO_EXTENSIONS.includes(ext)) return "Audio";
  return labels[ext] || "File";
}

const CODE_EXTENSIONS = [
  "html",
  "htm",
  "vue",
  "css",
  "scss",
  "less",
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "py",
  "pyw",
  "c",
  "h",
  "cpp",
  "cxx",
  "cc",
  "hpp",
  "hxx",
  "hh",
  "rs",
  "java",
  "sh",
  "bash",
  "zsh",
  "ps1"
];

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
