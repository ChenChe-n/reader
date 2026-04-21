import type { Ref } from "vue";
import type { FileSystemDirectoryHandleLike, PreviewState } from "../../types";

export interface UrlStore {
  create(file: Blob): string;
  clear(): void;
}

export interface ReaderViewContext {
  currentFile: Ref<File | null>;
  currentText: Ref<string>;
  currentFileDirectoryPath: Ref<string[]>;
  fileTitle: Ref<string>;
  fileMeta: Ref<string>;
  setPreview(next: PreviewState): void;
  urlStore: UrlStore;
}

export interface FilePreviewContext extends ReaderViewContext {
  rootHandle: Ref<FileSystemDirectoryHandleLike | null>;
  stack: Ref<string[]>;
}
