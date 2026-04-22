import type { Ref } from "vue";
import { clearReaderSession, ensureReadPermission, readReaderSession, writeReaderSession } from "../../api/readerConfig";
import type { FileSystemDirectoryHandleLike, FileSystemFileHandleLike, LocalEntry } from "../../types";

interface SessionActionsContext {
  rootHandle: Ref<FileSystemDirectoryHandleLike | null>;
  currentHandle: Ref<FileSystemDirectoryHandleLike | null>;
  directoryTrail: Ref<FileSystemDirectoryHandleLike[]>;
  stack: Ref<string[]>;
  entries: Ref<LocalEntry[]>;
  selectedName: Ref<string>;
  searchKeyword: Ref<string>;
  loadDirectory: (handle: FileSystemDirectoryHandleLike | null) => Promise<void>;
  openPreviewFile: (name: string, handle: FileSystemFileHandleLike) => Promise<void>;
  showEmpty: (title: string, message: string) => void;
  showNotice: (message: string) => void;
}

/**
 * 创建阅读器启动恢复和目录记忆动作。
 * @param context 会话动作上下文。
 * @returns 会话恢复、保存和路径定位方法。
 */
export function createSessionActions(context: SessionActionsContext) {
  /**
   * 静默保存当前目录和可选文件名。
   * @param fileName 当前文件名。
   * @returns 无返回值。
   */
  function rememberSession(fileName = ""): void {
    if (!context.rootHandle.value) return;
    void writeReaderSession({
      rootHandle: context.rootHandle.value,
      directoryPath: context.stack.value.slice(1),
      fileName
    }).catch(error => {
      console.warn("保存阅读器配置失败", error);
    });
  }

  /**
   * 尝试恢复上次打开的目录和文件。
   * @returns 异步完成信号。
   */
  async function restoreLastSession(): Promise<void> {
    try {
      const session = await readReaderSession();
      if (!session) return;
      if (!(await ensureReadPermission(session.rootHandle))) throw new Error("缺少读取权限");
      const restoreResult = await getDirectoryFromPath(session.rootHandle, session.directoryPath);
      context.rootHandle.value = session.rootHandle;
      context.directoryTrail.value = restoreResult.trail;
      context.stack.value = [session.rootHandle.name || session.rootName || "本地目录", ...session.directoryPath];
      context.selectedName.value = session.fileName;
      context.searchKeyword.value = "";
      await context.loadDirectory(restoreResult.directory);
      await restoreSessionFile(session.fileName, restoreResult.directory);
    } catch {
      await clearReaderSession();
      resetFailedSessionState();
      context.showNotice("上次打开的目录或文件无法恢复，已清空记录。请重新选择目录。");
    }
  }

  /**
   * 恢复会话中的文件，或显示已恢复目录提示。
   * @param fileName 会话文件名。
   * @param directory 当前目录句柄。
   * @returns 异步完成信号。
   */
  async function restoreSessionFile(fileName: string, directory: FileSystemDirectoryHandleLike): Promise<void> {
    if (!fileName) {
      context.showEmpty("已恢复上次目录", "选择左侧文件进行预览。");
      return;
    }
    const fileHandle = await directory.getFileHandle(fileName);
    await context.openPreviewFile(fileName, fileHandle);
  }

  /**
   * 根据根目录和路径片段定位目录。
   * @param root 根目录句柄。
   * @param path 路径片段。
   * @returns 目录和轨迹。
   */
  async function getDirectoryFromPath(
    root: FileSystemDirectoryHandleLike,
    path: string[]
  ): Promise<{ directory: FileSystemDirectoryHandleLike; trail: FileSystemDirectoryHandleLike[] }> {
    let directory = root;
    const trail = [root];
    for (const part of path) {
      directory = await directory.getDirectoryHandle(part);
      trail.push(directory);
    }
    return { directory, trail };
  }

  /**
   * 清理不可恢复会话留下的页面状态。
   * @returns 无返回值。
   */
  function resetFailedSessionState(): void {
    context.rootHandle.value = null;
    context.currentHandle.value = null;
    context.directoryTrail.value = [];
    context.stack.value = [];
    context.entries.value = [];
    context.selectedName.value = "";
  }

  return { rememberSession, restoreLastSession };
}
