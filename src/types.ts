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

export interface PreviewState {
  kind: "empty" | "notice" | "markdown" | "code" | "html" | "media";
  title?: string;
  message?: string;
  html?: string;
  text?: string;
  mediaKind?: "image" | "video" | "audio";
  url?: string;
  fileName?: string;
}

declare global {
  interface Window {
    showDirectoryPicker?: (options?: { mode?: "read" | "readwrite" }) => Promise<FileSystemDirectoryHandleLike>;
  }
}
