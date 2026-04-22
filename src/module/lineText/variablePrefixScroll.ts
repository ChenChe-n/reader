/**
 * 由各行高度构造前缀和，prefix[i] 为第 i 行顶边纵坐标。
 * @param heights 每行高度（像素）。
 * @returns 长度 heights.length + 1，末元素为总高。
 */
export function buildPrefixSum(heights: readonly number[]): number[] {
  const p = new Array(heights.length + 1);
  p[0] = 0;
  for (let i = 0; i < heights.length; i += 1) p[i + 1] = p[i] + heights[i];
  return p;
}

/**
 * 给定垂直滚动位置，求视口顶边所在行下标。
 * @param prefix buildPrefixSum 结果。
 * @param scrollPx 内容区向下滚动距离（像素）。
 * @param rowCount 行数（等于 heights.length）。
 */
export function topRowIndexForScroll(prefix: readonly number[], scrollPx: number, rowCount: number): number {
  if (rowCount <= 0) return 0;
  const y = Math.max(0, scrollPx);
  let lo = 0;
  let hi = rowCount - 1;
  let ans = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (prefix[mid] <= y) {
      ans = mid;
      lo = mid + 1;
    } else hi = mid - 1;
  }
  return ans;
}
