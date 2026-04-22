export type EntryKind = "file" | "directory";

export interface FileSystemHandleLike {
  readonly kind: EntryKind;
  readonly name: string;
}

export interface FileSystemFileHandleLike extends FileSystemHandleLike {
  readonly kind: "file";
  getFile(): Promise<File>;
  createWritable?(options?: { keepExistingData?: boolean }): Promise<FileSystemWritableFileStream>;
}

export interface FileSystemDirectoryHandleLike extends FileSystemHandleLike {
  readonly kind: "directory";
  entries(): AsyncIterableIterator<[string, LocalHandle]>;
  getDirectoryHandle(name: string): Promise<FileSystemDirectoryHandleLike>;
  getFileHandle(name: string): Promise<FileSystemFileHandleLike>;
}

export type LocalHandle = FileSystemFileHandleLike | FileSystemDirectoryHandleLike;

/** 文本预览 Worker 使用的模式。 */
export type TextPreviewWorkerMode = "markdown" | "text" | "json" | "html" | "fallback";

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
  directoryTrail?: FileSystemDirectoryHandleLike[];
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

export interface SpreadsheetCell {
  row: number;
  col: number;
  value: string;
}

export interface SpreadsheetMerge {
  startRow: number;
  startCol: number;
  endRow: number;
  endCol: number;
}

export interface SpreadsheetSheet {
  name: string;
  rowCount: number;
  colCount: number;
  cells: Record<string, SpreadsheetCell>;
  merges: SpreadsheetMerge[];
}

export interface SpreadsheetDocument {
  sheets: SpreadsheetSheet[];
}

export type PreviewState =
  | { kind: "empty"; title?: string; message?: string; html?: string }
  | { kind: "notice"; message?: string }
  | { kind: "markdown"; html?: string }
  | { kind: "html"; html?: string; sandbox?: string }
  | { kind: "document"; url?: string; fileName?: string; documentKind?: "pdf" }
  | { kind: "media"; mediaKind?: "image" | "video" | "audio"; url?: string; fileName?: string }
  | { kind: "spreadsheet"; spreadsheet: SpreadsheetDocument }
  | { kind: "lineText"; lineText: LineTextDocument };

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
  | "ico-up"
  | "ico-save"
  | "ico-edit";

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandleLike>;
  }
}
