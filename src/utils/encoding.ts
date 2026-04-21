export interface DecodeResult {
  text: string;
  encoding: string;
}

interface DecodeCandidate extends DecodeResult {
  score: number;
}

/**
 * 使用 BOM 和候选编码解码文本。
 * @param buffer 文件内容。
 * @returns 文本内容和识别到的编码。
 */
export function decodeTextBuffer(buffer: ArrayBuffer): DecodeResult {
  const bytes = new Uint8Array(buffer);
  const bom = detectBom(bytes);
  if (bom) return { text: new TextDecoder(bom.decoder).decode(bytes.slice(bom.length)), encoding: bom.label };
  return pickBestEncoding(buffer);
}

/**
 * 判断字节样本是否像二进制。
 * @param bytes 文件样本字节。
 * @returns 是否倾向二进制。
 */
export function looksBinary(bytes: Uint8Array): boolean {
  const sampleLength = Math.min(bytes.length, 4096);
  if (sampleLength === 0) return false;
  let suspicious = 0;
  for (let index = 0; index < sampleLength; index += 1) {
    const value = bytes[index];
    const allowed = [7, 8, 9, 10, 12, 13, 27].includes(value);
    if (value === 0) return true;
    if (value < 32 && !allowed) suspicious += 1;
  }
  return suspicious / sampleLength > 0.02;
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
  let best: DecodeCandidate | null = null;
  for (const [decoderName, label] of candidates) {
    const decoded = decodeCandidate(buffer, decoderName, label);
    if (decoded && (!best || decoded.score < best.score)) best = decoded;
  }
  return best ?? { text: new TextDecoder("utf-8", { fatal: false }).decode(buffer), encoding: "UTF-8 fallback" };
}

/**
 * 尝试用指定编码解码文本。
 * @param buffer 文件内容。
 * @param decoderName TextDecoder 编码名。
 * @param label 展示用编码标签。
 * @returns 候选解码结果，失败返回 null。
 */
function decodeCandidate(buffer: ArrayBuffer, decoderName: string, label: string): DecodeCandidate | null {
  try {
    const text = new TextDecoder(decoderName, { fatal: false }).decode(buffer);
    return { text, encoding: label, score: scoreDecodedText(text) };
  } catch {
    return null;
  }
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
