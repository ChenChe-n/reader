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
