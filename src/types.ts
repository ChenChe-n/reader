export type EntryKind = "file" | "directory";

export interface FileSystemHandleLike {
  readonly kind: EntryKind;
  readonly name: string;
}

export interface FileSystemFileHandleLike extends FileSystemHandleLike {
  readonly kind: "file";
  getFile(): Promise<File>;
}

export interface FileSystemDirectoryHandleLike extends FileSystemHandleLike {
  readonly kind: "directory";
  entries(): AsyncIterableIterator<[string, LocalHandle]>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandleLike>;
  getFileHandle(name: string): Promise<FileSystemFileHandleLike>;
}

export type LocalHandle = FileSystemFileHandleLike | FileSystemDirectoryHandleLike;

export interface LocalEntry {
  name: string;
  kind: EntryKind;
  handle: LocalHandle;
}

export interface RelativeFileResult {
  file: File;
  handle: FileSystemFileHandleLike;
  directory: FileSystemDirectoryHandleLike;
  directoryPath: string[];
}

export interface LineTextLine {
  data: string;
  style: Record<string, string>;
  meta?: Record<string, string>;
}

export interface LineTextDocument {
  lines: Record<string, LineTextLine>;
  lineCount: number;
}

export interface PreviewState {
  kind: "empty" | "notice" | "markdown" | "code" | "html" | "media" | "lineText";
  title?: string;
  message?: string;
  html?: string;
  text?: string;
  mediaKind?: "image" | "video" | "audio";
  url?: string;
  fileName?: string;
  sandbox?: string;
  lineText?: LineTextDocument;
}

export interface PreviewTiming {
  readMs: number;
  processMs: number;
}

export type ReaderIconName =
  | "dir-default"
  | "dir-open"
  | "dir-search"
  | "file-archive"
  | "file-audio"
  | "file-code"
  | "file-default"
  | "file-image"
  | "file-json"
  | "file-plain"
  | "file-search"
  | "file-text"
  | "file-video"
  | "ico-back"
  | "ico-copy"
  | "ico-download"
  | "ico-drive"
  | "ico-home"
  | "ico-maximize"
  | "ico-minimize"
  | "ico-panel-close"
  | "ico-panel-open"
  | "ico-refresh"
  | "ico-up";

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandleLike>;
  }
}
