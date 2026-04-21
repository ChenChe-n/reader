import { marked } from "marked";
import type { PreviewState } from "../../types";

marked.setOptions({ gfm: true, breaks: false });

/**
 * 创建 Markdown 富文本预览。
 * @param text Markdown 源码。
 * @returns Markdown 预览状态。
 */
export function markdownPreview(text: string): PreviewState {
  return { kind: "markdown", html: marked.parse(text) as string };
}
