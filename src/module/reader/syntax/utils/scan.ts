export function isIdentifierStart(char: string): boolean {
  return /[A-Za-z_$]/.test(char);
}

export function isIdentifierPart(char: string): boolean {
  return /[A-Za-z0-9_$]/.test(char);
}

/**
 * 判断字符是否为空白分隔符。
 *
 * @param char 待检查的单个字符。
 * @returns 如果字符属于空白字符则返回 true。
 */
export function isWhitespace(char: string): boolean {
  return /\s/.test(char);
}

/**
 * 读取从指定位置开始的非空白 token 结束位置。
 *
 * @param line 当前行文本。
 * @param start token 起始位置。
 * @returns token 结束位置。
 */
export function readWhitespaceTokenEnd(line: string, start: number): number {
  let index = start;
  while (index < line.length && !isWhitespace(line[index])) index += 1;
  return index;
}

/**
 * 从当前位置读取完整空白 token 并匹配关键字。
 *
 * @param line 当前行文本。
 * @param start token 起始位置。
 * @param keywords 可匹配的关键字集合。
 * @returns 命中关键字时返回 token 结束位置，否则返回 null。
 */
export function readKeywordTokenEnd(line: string, start: number, keywords: ReadonlySet<string>): number | null {
  if (start > 0 && !isWhitespace(line[start - 1])) return null;
  if (isWhitespace(line[start])) return null;
  const end = readWhitespaceTokenEnd(line, start);
  return keywords.has(line.slice(start, end)) ? end : null;
}

export function readQuotedString(line: string, start: number): number {
  const quote = line[start];
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    index += 1;
    if (char === quote) break;
  }
  return index;
}

export function readTemplateString(line: string, start: number): number {
  let index = start + 1;
  while (index < line.length) {
    const char = line[index];
    if (char === "\\") {
      index += 2;
      continue;
    }
    index += 1;
    if (char === "`") break;
  }
  return index;
}

export function nextNonSpace(line: string, start: number): string {
  let index = start;
  while (index < line.length && /\s/.test(line[index])) index += 1;
  return line[index] || "";
}
