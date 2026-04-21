interface DecodeResult {
  text: string;
  encoding: string;
}

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
  const buffer = readBuffer(file);
  const bytes = new Uint8Array(buffer);
  const bom = detectBom(bytes);
  if (bom) return { text: new TextDecoder(bom.decoder).decode(bytes.slice(bom.length)), encoding: bom.label };
  return pickBestEncoding(buffer);
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

/**
 * 从候选编码中选择最像文本的结果。
 * @param buffer 文件内容。
 * @returns 解码结果。
 */
function pickBestEncoding(buffer: ArrayBuffer): DecodeResult {
  const candidates: Array<[string, string]> = [
    ["utf-8", "UTF-8"],
    ["gb18030", "GB18030/GBK"],
    ["big5", "Big5"],
    ["shift_jis", "Shift_JIS"],
    ["windows-1252", "Windows-1252"]
  ];
  let best: (DecodeResult & { score: number }) | null = null;
  for (const [decoderName, label] of candidates) {
    try {
      const text = new TextDecoder(decoderName, { fatal: false }).decode(buffer);
      const score = scoreDecodedText(text);
      if (!best || score < best.score) best = { text, encoding: label, score };
    } catch {
      continue;
    }
  }
  return best ?? { text: new TextDecoder("utf-8", { fatal: false }).decode(buffer), encoding: "UTF-8 fallback" };
}

/**
 * 为解码结果打分。
 * @param text 解码后的文本。
 * @returns 错误倾向评分。
 */
function scoreDecodedText(text: string): number {
  const replacementCount = (text.match(/\uFFFD/g) || []).length;
  let controlCount = 0;
  for (let index = 0; index < text.length; index += 1) {
    const code = text.charCodeAt(index);
    if (code < 32 && ![9, 10, 13].includes(code)) controlCount += 1;
  }
  return replacementCount * 20 + controlCount;
}

/**
 * 检测文本 BOM。
 * @param bytes 文件字节。
 * @returns BOM 信息或 null。
 */
function detectBom(bytes: Uint8Array): { decoder: string; label: string; length: number } | null {
  if (bytes.length >= 3 && bytes[0] === 0xef && bytes[1] === 0xbb && bytes[2] === 0xbf) return { decoder: "utf-8", label: "UTF-8 BOM", length: 3 };
  if (bytes.length >= 2 && bytes[0] === 0xff && bytes[1] === 0xfe) return { decoder: "utf-16le", label: "UTF-16 LE", length: 2 };
  if (bytes.length >= 2 && bytes[0] === 0xfe && bytes[1] === 0xff) return { decoder: "utf-16be", label: "UTF-16 BE", length: 2 };
  return null;
}

/**
 * 判断样本是否像二进制。
 * @param bytes 样本字节。
 * @returns 是否倾向二进制。
 */
function looksBinary(bytes: Uint8Array): boolean {
  const sampleLength = Math.min(bytes.length, 4096);
  if (sampleLength === 0) return false;
  let suspicious = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    const value = bytes[index];
    if (value === 0) return true;
    if (value < 32 && ![7, 8, 9, 10, 12, 13, 27].includes(value)) suspicious += 1;
  }
  return suspicious / sampleLength > 0.02;
}
