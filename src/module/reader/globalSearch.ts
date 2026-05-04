import { reactive, type Ref } from "vue";
import type {
  FileSystemDirectoryHandleLike,
  FileSystemFileHandleLike,
  GlobalSearchMode,
  GlobalSearchResult,
  GlobalSearchState
} from "../../types";
import { readPlainTextIfPossible } from "../../utils/textReader";

const MAX_RESULTS = 200;
const MAX_CONTENT_BYTES = 2 * 1024 * 1024;

export interface GlobalSearchContext {
  currentHandle: Ref<FileSystemDirectoryHandleLike | null>;
  directoryTrail: Ref<FileSystemDirectoryHandleLike[]>;
  stack: Ref<string[]>;
}

interface SearchDirectoryTask {
  handle: FileSystemDirectoryHandleLike;
  pathParts: string[];
  trail: FileSystemDirectoryHandleLike[];
}

/**
 * 创建全局搜索状态和动作。
 * @param context 搜索上下文。
 * @returns 全局搜索能力。
 */
export function createGlobalSearchActions(context: GlobalSearchContext) {
  const state = reactive<GlobalSearchState>({
    keyword: "",
    mode: "name",
    includeSubdirectories: true,
    running: false,
    searchedFiles: 0,
    searchedDirectories: 0,
    skippedFiles: 0,
    status: "",
    results: []
  });
  let abortController: AbortController | null = null;

  /**
   * 启动一次全局搜索。
   * @returns 异步完成信号。
   */
  async function startGlobalSearch(): Promise<void> {
    const keyword = state.keyword.trim();
    const startHandle = context.currentHandle.value;
    if (!startHandle || !keyword || state.running) return;
    abortController = new AbortController();
    resetSearchRun();
    state.running = true;
    state.status = "正在搜索...";
    try {
      await searchDirectory(
        {
          handle: startHandle,
          pathParts: context.stack.value.slice(1),
          trail: [...context.directoryTrail.value]
        },
        keyword,
        abortController.signal
      );
      state.status = state.results.length >= MAX_RESULTS
        ? `已达到 ${MAX_RESULTS} 条结果上限`
        : `搜索完成，找到 ${state.results.length} 条结果`;
    } catch (error) {
      state.status = isAbortError(error) ? "搜索已取消" : `搜索失败：${(error as Error).message}`;
    } finally {
      state.running = false;
      abortController = null;
    }
  }

  /**
   * 取消当前全局搜索。
   * @returns 无返回值。
   */
  function cancelGlobalSearch(): void {
    abortController?.abort();
  }

  /**
   * 清空搜索结果。
   * @returns 无返回值。
   */
  function clearGlobalSearch(): void {
    cancelGlobalSearch();
    resetSearchRun();
    state.status = "";
  }

  async function searchDirectory(task: SearchDirectoryTask, keyword: string, signal: AbortSignal): Promise<void> {
    throwIfAborted(signal);
    state.searchedDirectories += 1;
    for await (const [name, handle] of task.handle.entries()) {
      throwIfAborted(signal);
      if (state.results.length >= MAX_RESULTS) return;
      const entryPath = [...task.pathParts, name];
      if (state.mode === "name" && nameMatches(name, keyword)) {
        addResult({
          id: `${state.mode}:${entryPath.join("/")}`,
          mode: state.mode,
          name,
          kind: handle.kind,
          pathParts: entryPath,
          directoryPath: task.pathParts,
          handle,
          directoryHandle: task.handle,
          directoryTrail: task.trail
        });
      }
      if (handle.kind === "file" && state.mode === "content") {
        await searchFileContent(handle as FileSystemFileHandleLike, name, task, entryPath, keyword, signal);
      }
      if (handle.kind === "directory" && state.includeSubdirectories) {
        await searchDirectory(
          {
            handle: handle as FileSystemDirectoryHandleLike,
            pathParts: entryPath,
            trail: [...task.trail, handle as FileSystemDirectoryHandleLike]
          },
          keyword,
          signal
        );
      }
    }
  }

  async function searchFileContent(
    handle: FileSystemFileHandleLike,
    name: string,
    task: SearchDirectoryTask,
    entryPath: string[],
    keyword: string,
    signal: AbortSignal
  ): Promise<void> {
    state.searchedFiles += 1;
    try {
      const file = await handle.getFile();
      throwIfAborted(signal);
      if (file.size > MAX_CONTENT_BYTES) {
        state.skippedFiles += 1;
        return;
      }
      const decoded = await readPlainTextIfPossible(file, signal);
      if (!decoded) {
        state.skippedFiles += 1;
        return;
      }
      addContentMatches(decoded.text, handle, name, task, entryPath, keyword);
    } catch (error) {
      if (isAbortError(error)) throw error;
      state.skippedFiles += 1;
    }
  }

  function addContentMatches(
    text: string,
    handle: FileSystemFileHandleLike,
    name: string,
    task: SearchDirectoryTask,
    entryPath: string[],
    keyword: string
  ): void {
    const normalizedKeyword = keyword.toLocaleLowerCase();
    const lines = text.split(/\r\n|\n|\r/);
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
      if (state.results.length >= MAX_RESULTS) return;
      const line = lines[lineIndex];
      const matchIndex = line.toLocaleLowerCase().indexOf(normalizedKeyword);
      if (matchIndex < 0) continue;
      addResult({
        id: `content:${entryPath.join("/")}:${lineIndex + 1}:${matchIndex}`,
        mode: "content",
        name,
        kind: "file",
        pathParts: entryPath,
        directoryPath: task.pathParts,
        handle,
        directoryHandle: task.handle,
        directoryTrail: task.trail,
        lineNumber: lineIndex + 1,
        snippet: buildSnippet(line, matchIndex, keyword.length)
      });
    }
  }

  function addResult(result: GlobalSearchResult): void {
    if (state.results.length >= MAX_RESULTS) return;
    state.results.push(result);
  }

  function resetSearchRun(): void {
    state.results = [];
    state.searchedFiles = 0;
    state.searchedDirectories = 0;
    state.skippedFiles = 0;
  }

  return { globalSearch: state, startGlobalSearch, cancelGlobalSearch, clearGlobalSearch };
}

function nameMatches(name: string, keyword: string): boolean {
  return name.toLocaleLowerCase().includes(keyword.toLocaleLowerCase());
}

function buildSnippet(line: string, matchIndex: number, matchLength: number): string {
  const start = Math.max(0, matchIndex - 36);
  const end = Math.min(line.length, matchIndex + matchLength + 56);
  const prefix = start > 0 ? "..." : "";
  const suffix = end < line.length ? "..." : "";
  return `${prefix}${line.slice(start, end).trim()}${suffix}`;
}

function throwIfAborted(signal: AbortSignal): void {
  if (signal.aborted) throw new DOMException("搜索已取消", "AbortError");
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError";
}
