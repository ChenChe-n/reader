import type { FileSystemDirectoryHandleLike, LocalEntry, RelativeFileResult } from "../types";

/**
 * 打开本地目录选择器。
 * @returns 用户选中的目录句柄。
 */
export async function pickDirectory(): Promise<FileSystemDirectoryHandleLike> {
  if (!window.showDirectoryPicker) {
    throw new Error("当前浏览器不支持本地目录选择。");
  }
  return window.showDirectoryPicker({ mode: "read" });
}

/**
 * 读取目录下的直接子项，并按目录优先和中文数字排序。
 * @param handle 目录句柄。
 * @returns 排序后的本地条目。
 */
export async function readDirectory(handle: FileSystemDirectoryHandleLike): Promise<LocalEntry[]> {
  const entries: LocalEntry[] = [];
  for await (const [name, entryHandle] of handle.entries()) {
    entries.push({ name, handle: entryHandle, kind: entryHandle.kind });
  }
  return entries.sort(compareEntry);
}

/**
 * 从根目录和相对路径定位文件。
 * @param rootHandle 根目录句柄。
 * @param basePathParts 当前文件所在目录路径。
 * @param relativePath 相对路径。
 * @returns 文件定位结果，找不到时返回 null。
 */
export async function getFileFromRelativePath(
  rootHandle: FileSystemDirectoryHandleLike,
  basePathParts: string[],
  relativePath: string
): Promise<RelativeFileResult | null> {
  const targetParts = normalizeRelativeParts(basePathParts, relativePath);
  if (!targetParts.length) return null;
  const fileName = targetParts[targetParts.length - 1];
  const directoryPath = targetParts.slice(0, -1);
  let directory = rootHandle;
  for (const part of directoryPath) {
    directory = await directory.getDirectoryHandle(part);
  }
  const handle = await directory.getFileHandle(fileName);
  return { file: await handle.getFile(), handle, directory, directoryPath };
}

/**
 * 获取去掉查询和锚点后的路径。
 * @param rawPath 原始路径。
 * @returns 纯路径部分。
 */
export function getPathWithoutSuffix(rawPath: string): string {
  return rawPath.split("#")[0].split("?")[0];
}

/**
 * 获取路径中的 hash 后缀。
 * @param rawPath 原始路径。
 * @returns hash 后缀。
 */
export function getHashSuffix(rawPath: string): string {
  const index = rawPath.indexOf("#");
  return index >= 0 ? rawPath.slice(index) : "";
}

/**
 * 判断链接是否只是页内锚点。
 * @param value 链接值。
 * @returns 是否为锚点。
 */
export function isAnchorOnly(value: string | null): boolean {
  return Boolean(value && value.trim().startsWith("#"));
}

/**
 * 判断资源地址是否应当按本地相对资源解析。
 * @param value 资源地址。
 * @returns 是否需要解析。
 */
export function shouldResolveLocalResource(value: string | null | undefined): boolean {
  if (!value) return false;
  const trimmed = value.trim();
  if (!trimmed || trimmed.startsWith("#")) return false;
  return !/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(trimmed);
}

/**
 * 按目录优先比较条目。
 * @param left 左侧条目。
 * @param right 右侧条目。
 * @returns 排序比较值。
 */
function compareEntry(left: LocalEntry, right: LocalEntry): number {
  if (left.kind !== right.kind) return left.kind === "directory" ? -1 : 1;
  return left.name.localeCompare(right.name, "zh-Hans-CN", { numeric: true, sensitivity: "base" });
}

/**
 * 将相对路径合并到当前路径。
 * @param basePathParts 当前目录路径。
 * @param relativePath 相对路径。
 * @returns 归一化后的路径片段。
 */
function normalizeRelativeParts(basePathParts: string[], relativePath: string): string[] {
  const normalized = decodeURIComponent(relativePath).replaceAll("\\", "/");
  const targetParts = [...basePathParts];
  for (const part of normalized.split("/")) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!targetParts.length) return [];
      targetParts.pop();
      continue;
    }
    targetParts.push(part);
  }
  return targetParts;
}
