import { decodeTextBuffer, looksBinary, type DecodeResult } from "../../utils/encoding";

declare const FileReaderSync: {
  new (): {
    readAsArrayBuffer(blob: Blob): ArrayBuffer;
  };
};

/**
 * 读取并识别文本编码。
 * @param file 待读取文件。
 * @returns 文本和编码。
 */
export function readTextWithEncoding(file: File): DecodeResult {
  return decodeTextBuffer(readBuffer(file));
}

/**
 * 判断 Blob 样本是否像二进制。
 * @param blob 样本内容。
 * @returns 是否倾向二进制。
 */
export function blobLooksBinary(blob: Blob): boolean {
  return looksBinary(new Uint8Array(readBuffer(blob)));
}

/**
 * 同步读取 Blob 内容。
 * @param blob 待读取内容。
 * @returns ArrayBuffer。
 */
function readBuffer(blob: Blob): ArrayBuffer {
  return new FileReaderSync().readAsArrayBuffer(blob);
}
