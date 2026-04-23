import { isWhitespace } from "./scan";
import type { SyntaxToken } from "./tokens";
import type { CodeSyntaxOptions, NormalToken, PendingFunction } from "./stateMachineTypes";

/**
 * 读取普通文本 token，并按关键字或普通 token 记录。
 *
 * @param line 当前行文本。
 * @param start token 起始位置。
 * @param end token 结束位置。
 * @param options 当前语言扫描配置。
 * @param tokens 当前行 token 输出列表。
 * @returns 如果是可作为函数候选的普通 token 则返回 token，否则返回 null。
 */
export function readNormalToken(line: string, start: number, end: number, options: CodeSyntaxOptions, tokens: SyntaxToken[]): NormalToken | null {
  const text = line.slice(start, end);
  if (options.keywords.has(text)) {
    tokens.push({ start, end, kind: "keyword" });
    return null;
  }
  return { start, end };
}

/**
 * 处理普通态分隔符，遇到有效右括号时回填函数 token。
 *
 * @param char 当前分隔符字符。
 * @param lastNormalToken 左括号前最近的普通 token。
 * @param pendingFunctions 待匹配右括号的函数候选列表。
 * @param tokens 当前行 token 输出列表。
 * @param parenDepth 当前括号深度。
 * @param markFunctions 是否启用函数回填。
 * @returns 无返回值。
 */
export function handleDelimiter(
  char: string,
  lastNormalToken: NormalToken | null,
  pendingFunctions: PendingFunction[],
  tokens: SyntaxToken[],
  parenDepth: number,
  markFunctions: boolean
): void {
  if (!markFunctions) return;
  if (char === "(" && lastNormalToken) {
    pendingFunctions.push({ depth: parenDepth, token: lastNormalToken });
    return;
  }
  if (char !== ")") return;
  const pendingIndex = findPendingFunction(pendingFunctions, Math.max(0, parenDepth - 1));
  if (pendingIndex < 0) return;
  const [{ token }] = pendingFunctions.splice(pendingIndex, 1);
  tokens.push({ start: token.start, end: token.end, kind: "function" });
}

/**
 * 根据当前分隔符计算下一步括号深度。
 *
 * @param char 当前分隔符字符。
 * @param parenDepth 当前括号深度。
 * @returns 更新后的括号深度。
 */
export function nextParenDepth(char: string, parenDepth: number): number {
  if (char === "(") return parenDepth + 1;
  if (char === ")") return Math.max(0, parenDepth - 1);
  return parenDepth;
}

/**
 * 判断当前分隔符后是否需要保留最近普通 token。
 *
 * @param char 当前分隔符字符。
 * @param lastNormalToken 当前最近普通 token。
 * @returns 空白字符保留最近 token，其他分隔符清空。
 */
export function nextLastNormalToken(char: string, lastNormalToken: NormalToken | null): NormalToken | null {
  return isWhitespace(char) ? lastNormalToken : null;
}

/**
 * 查找指定括号深度的待标记函数候选。
 *
 * @param pendingFunctions 待匹配右括号的函数候选列表。
 * @param depth 要匹配的括号深度。
 * @returns 命中的列表索引；没有命中则返回 -1。
 */
function findPendingFunction(pendingFunctions: PendingFunction[], depth: number): number {
  for (let index = pendingFunctions.length - 1; index >= 0; index -= 1) {
    if (pendingFunctions[index].depth === depth) return index;
  }
  return -1;
}
