import type { FilePreviewContext } from "./types";
import PreviewWorker from "./previewWorker?worker&inline";

export class CanceledPreviewLoad extends Error {}

export interface PreviewLoadSession {
  token: number;
  signal: AbortSignal;
  measureRead<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T>;
  runWorker<T>(file: File, mode: string): Promise<T>;
  confirmTextRead(file: File): Promise<boolean>;
  setTiming(readMs: number, processMs: number): void;
  updateTiming(): void;
  assertActive(): void;
}

/**
 * 创建单次预览加载会话。
 * @param context 文件预览上下文。
 * @returns 加载会话工具。
 */
export function createPreviewLoadSession(context: FilePreviewContext): PreviewLoadSession {
  const token = context.loadVersion.value + 1;
  const totalStart = performance.now();
  const controller = new AbortController();
  let readMs = 0;
  let pausedMs = 0;
  context.loadAbortController.value?.abort();
  context.loadWorker.value?.terminate();
  context.loadAbortController.value = controller;
  context.loadWorker.value = null;
  context.loadVersion.value = token;

  /**
   * 计量读取类异步任务。
   * @param task 读取任务。
   * @returns 任务结果。
   */
  async function measureRead<T>(task: (signal: AbortSignal) => Promise<T>): Promise<T> {
    assertActive();
    const readStart = performance.now();
    const result = await task(controller.signal);
    readMs += performance.now() - readStart;
    assertActive();
    return result;
  }

  /**
   * 请求文本读取确认，并扣除用户等待时间。
   * @param file 待读取文件。
   * @returns 是否继续读取。
   */
  async function confirmTextRead(file: File): Promise<boolean> {
    const pauseStart = performance.now();
    const confirmed = await context.confirmLargeText(file);
    pausedMs += performance.now() - pauseStart;
    assertActive();
    return confirmed;
  }

  /**
   * 在 Worker 中运行可强制终止的文件预览任务。
   * @param file 待读取文件。
   * @param mode 预览模式。
   * @returns Worker 返回结果。
   */
  function runWorker<T>(file: File, mode: string): Promise<T> {
    assertActive();
    return new Promise((resolve, reject) => {
      const worker = new PreviewWorker();
      const cleanup = () => {
        controller.signal.removeEventListener("abort", abort);
        if (context.loadWorker.value === worker) context.loadWorker.value = null;
        worker.terminate();
      };
      const abort = () => {
        cleanup();
        reject(new CanceledPreviewLoad());
      };
      context.loadWorker.value = worker;
      controller.signal.addEventListener("abort", abort, { once: true });
      worker.onmessage = (event: MessageEvent) => {
        cleanup();
        assertActive();
        const message = event.data as { ok: true; value: T } | { ok: false; error: string };
        if (message.ok) resolve(message.value);
        else reject(new Error(message.error));
      };
      worker.onerror = (event: ErrorEvent) => {
        cleanup();
        reject(event.error || new Error(event.message));
      };
      worker.postMessage({ file, mode });
    });
  }

  /**
   * 写入本次加载用时。
   * @returns 无返回值。
   */
  function updateTiming(): void {
    context.previewTiming.value = {
      readMs,
      processMs: Math.max(performance.now() - totalStart - readMs - pausedMs, 0)
    };
  }

  /**
   * 直接写入外部任务统计的用时。
   * @param nextReadMs 读取用时。
   * @param nextProcessMs 处理用时。
   * @returns 无返回值。
   */
  function setTiming(nextReadMs: number, nextProcessMs: number): void {
    readMs = nextReadMs;
    pausedMs = 0;
    context.previewTiming.value = {
      readMs,
      processMs: nextProcessMs
    };
  }

  /**
   * 确认当前加载会话仍有效。
   * @returns 无返回值。
   */
  function assertActive(): void {
    if (context.loadVersion.value !== token || controller.signal.aborted) throw new CanceledPreviewLoad();
  }

  return { token, signal: controller.signal, measureRead, runWorker, confirmTextRead, setTiming, updateTiming, assertActive };
}
