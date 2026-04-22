import { Archive } from "libarchive.js";
import workerSource from "libarchive.js/dist/worker-bundle.js?raw";
import wasmUrl from "libarchive.js/dist/libarchive.wasm?url";
import type {
  FileSystemDirectoryHandleLike,
  FileSystemFileHandleLike,
  LocalHandle
} from "../../types";
import { extensionOf } from "../../utils/fileKind";

type ArchiveReaderLike = Awaited<ReturnType<typeof Archive.open>>;
type CompressedFileLike = {
  name: string;
  size: number;
  lastModified: number;
  extract(): Promise<File>;
};

interface ArchiveTreeNode {
  name: string;
  directories: Map<string, ArchiveTreeNode>;
  files: Map<string, CompressedFileLike>;
}

let archiveInitialized = false;

/**
 * 判断文件名是否是支持进入浏览的压缩包。
 * @param name 文件名。
 * @returns 是否为支持的压缩包。
 */
export function isArchiveFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return (
    [".zip", ".rar", ".7z", ".tar", ".tgz", ".gz"].some(suffix => lower.endsWith(suffix)) ||
    lower.endsWith(".tar.gz")
  );
}

/**
 * 基于压缩包文件创建只读虚拟目录句柄。
 * @param name 压缩包文件名。
 * @param fileHandle 压缩包文件句柄。
 * @returns 虚拟目录句柄。
 */
export async function createArchiveDirectoryHandle(
  name: string,
  fileHandle: FileSystemFileHandleLike
): Promise<FileSystemDirectoryHandleLike> {
  initArchive();
  const file = await fileHandle.getFile();
  const archive = await Archive.open(file);
  try {
    const list = (await archive.getFilesArray()) as Array<{ file: CompressedFileLike; path: string }>;
    const root = createTreeNode(name);
    for (const entry of list) {
      if (!entry.file) continue;
      addFileNode(root, entry.path, entry.file);
    }
    return new ArchiveDirectoryHandle(name, root, archive);
  } catch (error) {
    await archive.close();
    throw error;
  }
}

/**
 * 初始化 libarchive 的内联 worker。
 * @returns 无返回值。
 */
function initArchive(): void {
  if (archiveInitialized) return;
  Archive.init({
    getWorker: () => {
      const source = workerSource
        .replace('N=new URL("libarchive.wasm",import.meta.url).href', `N=${JSON.stringify(wasmUrl)}`)
        .replaceAll("import.meta.url", JSON.stringify(wasmUrl));
      const url = URL.createObjectURL(new Blob([source], { type: "text/javascript" }));
      return new Worker(url);
    }
  });
  archiveInitialized = true;
}

/**
 * 创建目录树节点。
 * @param name 节点名。
 * @returns 目录树节点。
 */
function createTreeNode(name: string): ArchiveTreeNode {
  return { name, directories: new Map(), files: new Map() };
}

/**
 * 把压缩包内文件加入目录树。
 * @param root 根节点。
 * @param rawPath 文件所在路径。
 * @param file 压缩文件条目。
 * @returns 无返回值。
 */
function addFileNode(root: ArchiveTreeNode, rawPath: string, file: CompressedFileLike): void {
  const parts = normalizeArchivePath(rawPath);
  let node = root;
  for (const part of parts) {
    let next = node.directories.get(part);
    if (!next) {
      next = createTreeNode(part);
      node.directories.set(part, next);
    }
    node = next;
  }
  node.files.set(file.name, file);
}

/**
 * 归一化压缩包内路径。
 * @param rawPath 原始路径。
 * @returns 路径片段。
 */
function normalizeArchivePath(rawPath: string): string[] {
  return rawPath
    .replaceAll("\\", "/")
    .split("/")
    .map(part => part.trim())
    .filter(Boolean);
}

class ArchiveDirectoryHandle implements FileSystemDirectoryHandleLike {
  readonly kind = "directory" as const;

  constructor(
    readonly name: string,
    private readonly node: ArchiveTreeNode,
    private readonly archive: ArchiveReaderLike
  ) {}

  async *entries(): AsyncIterableIterator<[string, LocalHandle]> {
    for (const [name, child] of this.node.directories) {
      yield [name, new ArchiveDirectoryHandle(name, child, this.archive)];
    }
    for (const [name, file] of this.node.files) {
      yield [name, new ArchiveFileHandle(name, file)];
    }
  }

  async getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandleLike> {
    const child = this.node.directories.get(name);
    if (!child) throw new DOMException(`目录不存在：${name}`, "NotFoundError");
    return new ArchiveDirectoryHandle(name, child, this.archive);
  }

  async getFileHandle(name: string): Promise<FileSystemFileHandleLike> {
    const file = this.node.files.get(name);
    if (!file) throw new DOMException(`文件不存在：${name}`, "NotFoundError");
    return new ArchiveFileHandle(name, file);
  }
}

class ArchiveFileHandle implements FileSystemFileHandleLike {
  readonly kind = "file" as const;

  constructor(
    readonly name: string,
    private readonly compressedFile: CompressedFileLike
  ) {}

  async getFile(): Promise<File> {
    const file = await this.compressedFile.extract();
    const ext = extensionOf(file.name || this.name);
    return new File([file], file.name || this.name, {
      type: file.type || mimeForArchiveEntry(ext),
      lastModified: normalizeLastModified(file.lastModified || this.compressedFile.lastModified)
    });
  }
}

/**
 * 修正部分归档格式返回的纳秒时间戳。
 * @param value 原始时间戳。
 * @returns 毫秒时间戳。
 */
function normalizeLastModified(value: number): number {
  if (!Number.isFinite(value) || value <= 0) return Date.now();
  return value > 10_000_000_000_000 ? Math.floor(value / 1_000_000) : value;
}

/**
 * 为压缩包内常见条目补充 MIME。
 * @param ext 后缀。
 * @returns MIME 类型。
 */
function mimeForArchiveEntry(ext: string): string {
  const map: Record<string, string> = {
    css: "text/css",
    csv: "text/csv",
    html: "text/html",
    htm: "text/html",
    js: "text/javascript",
    json: "application/json",
    md: "text/markdown",
    markdown: "text/markdown",
    svg: "image/svg+xml",
    txt: "text/plain"
  };
  return map[ext] || "application/octet-stream";
}
