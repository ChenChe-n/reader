import { ref } from "vue";

/**
 * 创建预览加载控制状态。
 * @returns 加载版本、取消控制器和 Worker 引用。
 */
export function createLoadingState() {
  return {
    loadVersion: ref(0),
    loadAbortController: ref<AbortController | null>(null),
    loadWorker: ref<Worker | null>(null)
  };
}
