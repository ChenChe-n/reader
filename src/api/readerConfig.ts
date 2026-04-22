import type { FileSystemDirectoryHandleLike } from "../types";

const DB_NAME = "reader-config";
const DB_VERSION = 1;
const STORE_NAME = "config";
const SESSION_KEY = "last-session";
const CONFIG_DIRECTORY = ["config", "reader"];
const CONFIG_FILE_NAME = "session.json";

export interface ReaderSessionConfig {
  version: 1;
  savedAt: string;
  rootName: string;
  directoryPath: string[];
  fileName: string;
  rootHandle: FileSystemDirectoryHandleLike;
}

export interface ReaderSessionSnapshot {
  rootHandle: FileSystemDirectoryHandleLike;
  directoryPath: string[];
  fileName?: string;
}

/**
 * 读取上次阅读会话。
 * @returns 保存的会话配置。
 */
export async function readReaderSession(): Promise<ReaderSessionConfig | null> {
  const db = await openConfigDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readonly").objectStore(STORE_NAME).get(SESSION_KEY);
    request.onsuccess = () => resolve(normalizeSessionConfig(request.result));
    request.onerror = () => reject(request.error);
  });
}

/**
 * 保存当前阅读位置。
 * @param snapshot 当前目录和文件状态。
 * @returns 异步完成信号。
 */
export async function writeReaderSession(snapshot: ReaderSessionSnapshot): Promise<void> {
  const config: ReaderSessionConfig = {
    version: 1,
    savedAt: new Date().toISOString(),
    rootName: snapshot.rootHandle.name || "本地目录",
    directoryPath: [...snapshot.directoryPath],
    fileName: snapshot.fileName || "",
    rootHandle: snapshot.rootHandle
  };
  await writeSessionToIndexedDb(config);
  await tryWriteSessionFile(config);
}

/**
 * 清空保存的阅读位置。
 * @returns 异步完成信号。
 */
export async function clearReaderSession(): Promise<void> {
  await deleteSessionFromIndexedDb();
  await tryDeleteSessionFile();
}

/**
 * 确认持久化目录句柄仍可读取。
 * @param handle 目录句柄。
 * @returns 是否拥有读取权限。
 */
export async function ensureReadPermission(handle: FileSystemDirectoryHandleLike): Promise<boolean> {
  const descriptor = { mode: "read" as const };
  if ((await handle.queryPermission?.(descriptor)) === "granted") return true;
  return (await handle.requestPermission?.(descriptor)) === "granted";
}

async function writeSessionToIndexedDb(config: ReaderSessionConfig): Promise<void> {
  const db = await openConfigDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).put(config, SESSION_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function deleteSessionFromIndexedDb(): Promise<void> {
  const db = await openConfigDb();
  return new Promise((resolve, reject) => {
    const request = db.transaction(STORE_NAME, "readwrite").objectStore(STORE_NAME).delete(SESSION_KEY);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function openConfigDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) request.result.createObjectStore(STORE_NAME);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function writeSessionFile(config: ReaderSessionConfig): Promise<void> {
  const directory = await getConfigDirectory();
  if (!directory) return;
  const fileHandle = await directory.getFileHandle(CONFIG_FILE_NAME, { create: true });
  const writable = await fileHandle.createWritable();
  const { rootHandle: _rootHandle, ...portableConfig } = config;
  await writable.write(new Blob([JSON.stringify(portableConfig, null, 2)], { type: "application/json;charset=utf-8" }));
  await writable.close();
}

async function tryWriteSessionFile(config: ReaderSessionConfig): Promise<void> {
  try {
    await writeSessionFile(config);
  } catch {
    // 浏览器可能拒绝 OPFS 中的部分文件写入；IndexedDB 中的句柄配置仍可正常恢复。
  }
}

async function deleteSessionFile(): Promise<void> {
  const directory = await getConfigDirectory();
  if (!directory) return;
  try {
    await directory.removeEntry(CONFIG_FILE_NAME);
  } catch (error) {
    if (!(error instanceof DOMException && error.name === "NotFoundError")) throw error;
  }
}

async function tryDeleteSessionFile(): Promise<void> {
  try {
    await deleteSessionFile();
  } catch {
    // 清理备份文件失败不影响主配置清理。
  }
}

async function getConfigDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (!navigator.storage?.getDirectory) return null;
  let directory = await navigator.storage.getDirectory();
  for (const name of CONFIG_DIRECTORY) {
    directory = await directory.getDirectoryHandle(name, { create: true });
  }
  return directory;
}

function normalizeSessionConfig(value: unknown): ReaderSessionConfig | null {
  const config = value as Partial<ReaderSessionConfig> | null;
  if (!config?.rootHandle || config.rootHandle.kind !== "directory") return null;
  return {
    version: 1,
    savedAt: typeof config.savedAt === "string" ? config.savedAt : "",
    rootName: typeof config.rootName === "string" ? config.rootName : config.rootHandle.name || "本地目录",
    directoryPath: Array.isArray(config.directoryPath) ? config.directoryPath.filter(isPathPart) : [],
    fileName: typeof config.fileName === "string" ? config.fileName : "",
    rootHandle: config.rootHandle
  };
}

function isPathPart(value: unknown): value is string {
  return typeof value === "string" && Boolean(value) && value !== "." && value !== ".." && !value.includes("/");
}
