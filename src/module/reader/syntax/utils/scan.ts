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
 * 判断字符是否是编程语言中常见的 token 分隔符。
 *
 * @param char 待检查的单个字符。
 * @returns 如果字符应当切断普通 token 则返回 true。
 */
export function isProgramTokenDelimiter(char: string): boolean {
  return /[(){}\[\]<>,;:+\-*/%=!&|^~?.]/.test(char);
}

/**
 * 判断字符是否会切断普通代码 token。
 *
 * @param char 待检查的单个字符。
 * @returns 如果字符是空白或常见编程分隔符则返回 true。
 */
export function isProgramTokenBoundary(char: string): boolean {
  return isWhitespace(char) || isProgramTokenDelimiter(char);
}

/**
 * 读取从指定位置开始的普通代码 token 结束位置。
 *
 * @param line 当前行文本。
 * @param start token 起始位置。
 * @returns 如果起始位置可形成 token 则返回结束位置，否则返回 null。
 */
export function readProgramTokenEnd(line: string, start: number): number | null {
  const char = line[start] ?? "";
  if (!char || isProgramTokenBoundary(char)) return null;
  let index = start + 1;
  while (index < line.length && !isProgramTokenBoundary(line[index])) index += 1;
  return index;
}

/**
 * 从当前位置读取完整普通代码 token 并匹配关键字。
 *
 * @param line 当前行文本。
 * @param start token 起始位置。
 * @param keywords 可匹配的关键字集合。
 * @returns 命中关键字时返回 token 结束位置，否则返回 null。
 */
export function readKeywordTokenEnd(line: string, start: number, keywords: ReadonlySet<string>): number | null {
  if (start > 0 && !isProgramTokenBoundary(line[start - 1])) return null;
  const end = readProgramTokenEnd(line, start);
  if (end === null) return null;
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
