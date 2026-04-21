import { decodeTextBuffer, looksBinary, type DecodeResult } from "./encoding";

/**
 * 在文件看起来不是二进制时按文本读取。
 * @param file 待读取文件。
 * @returns 文本读取结果，二进制文件返回 null。
 */
export async function readPlainTextIfPossible(file: File, signal?: AbortSignal): Promise<DecodeResult | null> {
  if (await fileLooksBinary(file, signal)) return null;
  return readTextWithEncoding(file, signal);
}

/**
 * 根据文件样本判断文件是否像二进制。
 * @param file 待读取文件。
 * @returns 是否倾向二进制。
 */
export async function fileLooksBinary(file: File, signal?: AbortSignal): Promise<boolean> {
  const sampleBuffer = await readBlobAsArrayBuffer(file.slice(0, 4096), signal);
  return looksBinary(new Uint8Array(sampleBuffer));
}

/**
 * 使用 BOM 和常见编码候选读取文本。
 * @param file 待读取文件。
 * @returns 文本内容和识别到的编码。
 */
export async function readTextWithEncoding(file: File, signal?: AbortSignal): Promise<DecodeResult> {
  const buffer = await readBlobAsArrayBuffer(file, signal);
  throwIfAborted(signal);
  return decodeTextBuffer(buffer);
}

/**
 * 使用可取消的 FileReader 读取 Blob。
 * @param blob 待读取内容。
 * @param signal 取消信号。
 * @returns ArrayBuffer 内容。
 */
function readBlobAsArrayBuffer(blob: Blob, signal?: AbortSignal): Promise<ArrayBuffer> {
  throwIfAborted(signal);
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    const abort = () => {
      reader.abort();
      reject(new DOMException("读取已取消", "AbortError"));
    };
    reader.onload = () => {
      signal?.removeEventListener("abort", abort);
      resolve(reader.result as ArrayBuffer);
    };
    reader.onerror = () => {
      signal?.removeEventListener("abort", abort);
      reject(reader.error || new Error("文件读取失败"));
    };
    reader.onabort = () => {
      signal?.removeEventListener("abort", abort);
      reject(new DOMException("读取已取消", "AbortError"));
    };
    signal?.addEventListener("abort", abort, { once: true });
    reader.readAsArrayBuffer(blob);
  });
}

/**
 * 在取消时抛出 AbortError。
 * @param signal 取消信号。
 * @returns 无返回值。
 */
function throwIfAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new DOMException("读取已取消", "AbortError");
}
