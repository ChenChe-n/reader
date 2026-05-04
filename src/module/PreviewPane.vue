<template>
  <section class="viewer">
    <div class="viewer-head">
      <button class="button icon-only viewer-expand-toggle" title="展开文件区" @click="$emit('expand')">
        <IconView name="ico-panel-open" />
      </button>
      <div v-if="hasFile" class="preview-timing" aria-label="预览加载用时">
        <span>读取 {{ readTimingLabel }}</span>
        <span>处理 {{ processTimingLabel }}</span>
      </div>
      <div class="file-title">
        <strong>{{ fileTitle }}</strong>
        <span>{{ fileMeta }}</span>
      </div>
      <div class="viewer-actions">
        <button
          class="button icon-only"
          title="保存到本地文件（UTF-8）"
          :disabled="!canSave"
          @click="$emit('save')"
        >
          <IconView name="ico-save" />
        </button>
        <button class="button icon-only" title="复制文本内容" :disabled="!hasText" @click="$emit('copy')">
          <IconView name="ico-copy" />
        </button>
        <button class="button icon-only" title="当前文件查找" :disabled="!canSearchCurrentFile" @click="openSearchPanel">
          <IconView name="file-search" />
        </button>
        <button class="button icon-only" title="下载当前文件" :disabled="!hasFile" @click="$emit('download')">
          <IconView name="ico-download" />
        </button>
      </div>
    </div>

    <form v-if="searchPanelOpen" class="file-search-panel" @submit.prevent="goToNextSearchMatch">
      <input
        ref="searchInputRef"
        v-model="searchKeyword"
        class="file-search-input"
        type="search"
        placeholder="查找当前文件"
        @keydown.esc.prevent="closeSearchPanel"
      />
      <span class="file-search-count">{{ searchStatusLabel }}</span>
      <button class="button icon-only" type="button" title="上一个匹配" :disabled="!hasSearchMatches" @click="goToPreviousSearchMatch">
        <IconView name="ico-prev" />
      </button>
      <button class="button icon-only" type="submit" title="下一个匹配" :disabled="!hasSearchMatches">
        <IconView name="ico-next" />
      </button>
      <input
        v-model="lineJumpInput"
        class="line-jump-input"
        type="text"
        inputmode="numeric"
        placeholder="行号"
        @keydown.enter.prevent="jumpToInputLine"
        @keydown.esc.prevent="closeSearchPanel"
      />
      <button class="button" type="button" :disabled="!canJumpToLine" @click="jumpToInputLine">跳转</button>
      <button class="button icon-only" type="button" title="关闭查找" @click="closeSearchPanel">
        <IconView name="ico-panel-close" />
      </button>
    </form>

    <div
      v-if="!previewEditing"
      ref="contentRef"
      :class="['content', { 'content-frame': preview.kind === 'html' || preview.kind === 'document' }]"
      @click="handleContentClick"
    >
      <div v-if="preview.kind === 'notice'" class="notice">{{ preview.message }}</div>
      <article v-else-if="preview.kind === 'markdown'" ref="markdownRef" class="markdown" v-html="preview.html"></article>
      <LineTextViewer
        v-else-if="preview.kind === 'lineText'"
        ref="lineViewerRef"
        :document="preview.lineText"
        :search-query="searchKeyword"
        :active-search-line="activeSearchMatch?.lineIndex"
        :active-search-start="activeSearchMatch?.start"
      />
      <SpreadsheetViewer v-else-if="preview.kind === 'spreadsheet'" :document="preview.spreadsheet" />
      <iframe
        v-else-if="preview.kind === 'html'"
        class="html-frame"
        :src="htmlPreviewUrl"
        :sandbox="preview.sandbox || iframeSandbox"
        title="HTML 预览"
      ></iframe>
      <iframe
        v-else-if="preview.kind === 'document'"
        class="document-frame"
        :src="preview.url"
        :title="preview.fileName || '文档预览'"
      ></iframe>
      <div v-else-if="preview.kind === 'media'" :class="['media-stage', imageDisplayClass]">
        <img v-if="preview.mediaKind === 'image'" :src="preview.url" :alt="preview.fileName" />
        <video v-else-if="preview.mediaKind === 'video'" :src="preview.url" controls playsinline></video>
        <audio v-else :src="preview.url" controls></audio>
      </div>
      <div v-else-if="preview.kind === 'empty'" class="empty">
        <div class="empty-inner">
          <div class="empty-icon"><IconView name="dir-search" /></div>
          <h2>{{ preview.title }}</h2>
          <p>{{ preview.message }}</p>
        </div>
      </div>
    </div>
    <div v-else class="content line-text-editor-wrap">
      <LineTextEditor ref="lineEditorRef" v-model="draftText" :line-mode="editLineMode" />
    </div>

    <div v-if="showImagePager" class="image-pager" aria-label="图片翻页">
      <button
        class="image-pager-button image-pager-prev"
        type="button"
        title="上一张（← / Backspace）"
        :disabled="!canOpenPreviousImage"
        @click="$emit('previous-image')"
      >
        <IconView name="ico-prev" />
      </button>
      <div class="image-pager-count">{{ imagePosition }} / {{ imageCount }}</div>
      <button
        class="image-pager-button image-pager-next"
        type="button"
        title="下一张（→ / Space）"
        :disabled="!canOpenNextImage"
        @click="$emit('next-image')"
      >
        <IconView name="ico-next" />
      </button>
    </div>

    <div v-if="showImageTools" class="image-mode-switch" role="group" aria-label="图片显示模式">
      <button
        v-for="option in imageDisplayOptions"
        :key="option.value"
        type="button"
        :class="['image-mode-button', { active: imageDisplayMode === option.value }]"
        :title="option.title"
        @click="$emit('set-image-display-mode', option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="preview-corner-actions">
      <button class="svg-action preview-scroll-action" type="button" title="返回顶部" aria-label="返回顶部" @click="scrollToTop">
        <IconView name="ico-up" />
      </button>
      <button class="svg-action" type="button" :title="fullscreenTip" :aria-label="fullscreenTip" @click="$emit('toggle-fullscreen')">
        <IconView :name="isPreviewMaximized ? 'ico-minimize' : 'ico-maximize'" />
      </button>
      <button
        v-if="canToggleHtmlPreview && !previewEditing"
        class="svg-action preview-html-mode-action"
        type="button"
        :title="htmlPreviewToggleTip"
        :aria-label="htmlPreviewToggleTip"
        @click="$emit('toggle-html-preview')"
      >
        <IconView :name="htmlPreviewMode === 'web' ? 'ico-code' : 'ico-web'" />
      </button>
      <button
        v-if="canEditPreview"
        class="svg-action preview-edit-action"
        type="button"
        :title="editToggleTip"
        :aria-label="editToggleTip"
        @click="$emit('toggle-edit')"
      >
        <IconView :name="previewEditing ? 'ico-panel-close' : 'ico-edit'" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { isAnchorOnly, shouldResolveLocalResource } from "../api/localFiles";
import type { FileSystemDirectoryHandleLike, PreviewState, PreviewTiming } from "../types";
import { rewriteHtmlRelativeResources, rewriteRelativeResources } from "../utils/resourceRewriter";
import IconView from "./IconView.vue";
import LineTextEditor from "./LineTextEditor.vue";
import LineTextViewer from "./LineTextViewer.vue";
import SpreadsheetViewer from "./SpreadsheetViewer.vue";
import type { ImageDisplayMode } from "./reader/types";
import type { LineMode } from "./reader/workerLineStyles";

const draftText = defineModel<string>("draftText", { required: true });

const props = defineProps<{
  preview: PreviewState;
  fileTitle: string;
  fileMeta: string;
  previewTiming: PreviewTiming;
  hasText: boolean;
  currentText: string;
  hasFile: boolean;
  canSave: boolean;
  canEditPreview: boolean;
  canToggleHtmlPreview: boolean;
  htmlPreviewMode: "web" | "code";
  imageDisplayMode: ImageDisplayMode;
  previewEditing: boolean;
  isPreviewMaximized: boolean;
  imagePosition: number;
  imageCount: number;
  canOpenPreviousImage: boolean;
  canOpenNextImage: boolean;
  rootHandle: FileSystemDirectoryHandleLike | null;
  basePathParts: string[];
  createObjectUrl: (file: Blob) => string;
  editLineMode: LineMode;
  jumpLineRequest: { line: number; token: number };
}>();

const emit = defineEmits<{
  copy: [];
  download: [];
  save: [];
  expand: [];
  "toggle-fullscreen": [];
  "toggle-edit": [];
  "toggle-html-preview": [];
  "set-image-display-mode": [mode: ImageDisplayMode];
  "previous-image": [];
  "next-image": [];
  "open-relative": [href: string];
}>();

const contentRef = ref<HTMLElement | null>(null);
const markdownRef = ref<HTMLElement | null>(null);
const lineViewerRef = ref<InstanceType<typeof LineTextViewer> | null>(null);
const lineEditorRef = ref<InstanceType<typeof LineTextEditor> | null>(null);
const searchInputRef = ref<HTMLInputElement | null>(null);
const htmlPreviewUrl = ref("about:blank");
const searchPanelOpen = ref(false);
const searchKeyword = ref("");
const activeSearchIndex = ref(-1);
const lineJumpInput = ref("");
const iframeSandbox = "allow-forms allow-popups allow-scripts allow-modals allow-same-origin";
const fullscreenTip = computed(() => (props.isPreviewMaximized ? "还原预览" : "最大化预览"));
const editToggleTip = computed(() => (props.previewEditing ? "关闭编辑" : "编辑"));
const htmlPreviewToggleTip = computed(() => (props.htmlPreviewMode === "web" ? "代码预览" : "网页预览"));
const readTimingLabel = computed(() => formatDuration(props.previewTiming.readMs));
const processTimingLabel = computed(() => formatDuration(props.previewTiming.processMs));
const imageDisplayOptions: Array<{ value: ImageDisplayMode; label: string; title: string }> = [
  { value: "fit-page", label: "适页", title: "完整显示图片" },
  { value: "fit-width", label: "适宽", title: "图片宽度适应预览区" },
  { value: "fit-height", label: "适高", title: "图片高度适应预览区" },
  { value: "original", label: "原始", title: "按原始尺寸显示图片" }
];
const showImageTools = computed(() => !props.previewEditing && props.preview.kind === "media" && props.preview.mediaKind === "image");
const showImagePager = computed(
  () => showImageTools.value && props.imageCount > 1
);
const imageDisplayClass = computed(() => `media-stage-image-${props.imageDisplayMode}`);
const searchableText = computed(() => (props.preview.kind === "lineText" || props.preview.kind === "markdown" ? props.currentText : ""));
const canSearchCurrentFile = computed(() => !props.previewEditing && searchableText.value.length > 0);
const textLines = computed(() => searchableText.value.split(/\r\n|\n|\r/));
const searchMatches = computed(() => {
  const query = searchKeyword.value.trim().toLocaleLowerCase();
  if (!query || !canSearchCurrentFile.value) return [];
  const matches: Array<{ lineIndex: number; start: number; end: number }> = [];
  textLines.value.forEach((line, lineIndex) => {
    const source = line.toLocaleLowerCase();
    let start = source.indexOf(query);
    while (start >= 0) {
      matches.push({ lineIndex, start, end: start + query.length });
      start = source.indexOf(query, start + query.length);
    }
  });
  return matches;
});
const hasSearchMatches = computed(() => searchMatches.value.length > 0);
const activeSearchMatch = computed(() => searchMatches.value[activeSearchIndex.value] || null);
const searchStatusLabel = computed(() => {
  if (!searchKeyword.value.trim()) return "请输入关键词";
  if (!searchMatches.value.length) return "0 / 0";
  return `${activeSearchIndex.value + 1} / ${searchMatches.value.length}`;
});
const canJumpToLine = computed(() => {
  const line = Number(lineJumpInput.value);
  return Number.isInteger(line) && line >= 1 && line <= textLines.value.length;
});

/**
 * 滚动预览区域到顶部。
 * @returns 无返回值。
 */
function scrollToTop(): void {
  if (props.previewEditing) {
    lineEditorRef.value?.scrollToTop();
    return;
  }
  if (props.preview.kind === "lineText") {
    lineViewerRef.value?.scrollToTop();
    return;
  }
  contentRef.value?.scrollTo({ top: 0, behavior: "smooth" });
}

function openSearchPanel(): void {
  if (!canSearchCurrentFile.value) return;
  searchPanelOpen.value = true;
  nextTick(() => {
    searchInputRef.value?.focus();
    searchInputRef.value?.select();
  });
}

function closeSearchPanel(): void {
  searchPanelOpen.value = false;
  searchKeyword.value = "";
  activeSearchIndex.value = -1;
  clearMarkdownSearchMarks();
}

function goToNextSearchMatch(): void {
  if (!searchMatches.value.length) return;
  activeSearchIndex.value = (activeSearchIndex.value + 1) % searchMatches.value.length;
  scrollToActiveSearchMatch();
}

function goToPreviousSearchMatch(): void {
  if (!searchMatches.value.length) return;
  activeSearchIndex.value = activeSearchIndex.value <= 0 ? searchMatches.value.length - 1 : activeSearchIndex.value - 1;
  scrollToActiveSearchMatch();
}

function jumpToInputLine(): void {
  if (!canJumpToLine.value) return;
  scrollToLine(Number(lineJumpInput.value));
}

function scrollToLine(lineNumber: number): void {
  if (props.preview.kind === "lineText") {
    lineViewerRef.value?.scrollToLine(lineNumber);
    return;
  }
  if (props.preview.kind === "markdown") {
    const lineText = textLines.value[Math.max(0, lineNumber - 1)]?.trim();
    scrollMarkdownToText(lineText);
  }
}

function scrollToActiveSearchMatch(): void {
  const match = activeSearchMatch.value;
  if (!match) return;
  if (props.preview.kind === "lineText") {
    lineViewerRef.value?.scrollToLine(match.lineIndex + 1);
    return;
  }
  if (props.preview.kind === "markdown") {
    nextTick(() => {
      applyMarkdownSearchMarks();
      markdownRef.value
        ?.querySelector(".markdown-search-match-active")
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
  }
}

function scrollMarkdownToText(text: string | undefined): void {
  const root = markdownRef.value;
  if (!text || !root) return;
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  while (walker.nextNode()) {
    const node = walker.currentNode;
    if (node.textContent?.includes(text)) {
      (node.parentElement || markdownRef.value)?.scrollIntoView({ block: "center", behavior: "smooth" });
      return;
    }
  }
}

/**
 * 格式化预览用时。
 * @param milliseconds 原始毫秒数。
 * @returns 展示用时文本。
 */
function formatDuration(milliseconds: number): string {
  if (milliseconds >= 1000) return `${(milliseconds / 1000).toFixed(2)} s`;
  if (milliseconds >= 10) return `${milliseconds.toFixed(0)} ms`;
  return `${milliseconds.toFixed(1)} ms`;
}

/**
 * 处理 Markdown 中的本地相对链接点击。
 * @param event 鼠标点击事件。
 * @returns 无返回值。
 */
function handleContentClick(event: MouseEvent): void {
  const link = (event.target as HTMLElement | null)?.closest?.("a[href]");
  const href = link?.getAttribute("href");
  if (!href || isAnchorOnly(href) || !shouldResolveLocalResource(href)) return;
  event.preventDefault();
  emit("open-relative", href);
}

function handleSearchShortcut(event: KeyboardEvent): void {
  if ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "f" && canSearchCurrentFile.value) {
    event.preventDefault();
    openSearchPanel();
    return;
  }
  if (!searchPanelOpen.value || !canSearchCurrentFile.value) return;
  if (event.key === "F3" || ((event.ctrlKey || event.metaKey) && event.key.toLocaleLowerCase() === "g")) {
    event.preventDefault();
    if (event.shiftKey) goToPreviousSearchMatch();
    else goToNextSearchMatch();
  }
}

/**
 * 处理 HTML iframe 发来的相对链接导航消息。
 * @param event message 事件。
 * @returns 无返回值。
 */
function handlePreviewMessage(event: MessageEvent): void {
  const data = event.data;
  if (!data || data.type !== "reader:navigate" || typeof data.href !== "string") return;
  if (!isAnchorOnly(data.href) && shouldResolveLocalResource(data.href)) emit("open-relative", data.href);
}

function setHtmlPreviewUrl(html: string): void {
  revokeHtmlPreviewUrl();
  htmlPreviewUrl.value = URL.createObjectURL(new Blob([html], { type: "text/html;charset=utf-8" }));
}

function clearHtmlPreviewUrl(): void {
  revokeHtmlPreviewUrl();
  htmlPreviewUrl.value = "about:blank";
}

function clearMarkdownSearchMarks(): void {
  const root = markdownRef.value;
  if (!root) return;
  root.querySelectorAll("mark.markdown-search-match").forEach(mark => {
    const parent = mark.parentNode;
    if (!parent) return;
    parent.replaceChild(document.createTextNode(mark.textContent || ""), mark);
    parent.normalize();
  });
}

function applyMarkdownSearchMarks(): void {
  clearMarkdownSearchMarks();
  const root = markdownRef.value;
  const query = searchKeyword.value.trim();
  if (!root || !query) return;
  const lowerQuery = query.toLocaleLowerCase();
  let seen = 0;
  const textNodes: Text[] = [];
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode: node => node.parentElement?.closest("script, style") ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT
  });
  while (walker.nextNode()) textNodes.push(walker.currentNode as Text);
  textNodes.forEach(node => {
    const text = node.data;
    const lower = text.toLocaleLowerCase();
    let cursor = 0;
    let index = lower.indexOf(lowerQuery);
    if (index < 0) return;
    const fragment = document.createDocumentFragment();
    while (index >= 0) {
      if (index > cursor) fragment.append(document.createTextNode(text.slice(cursor, index)));
      const mark = document.createElement("mark");
      mark.className = seen === activeSearchIndex.value ? "markdown-search-match markdown-search-match-active" : "markdown-search-match";
      mark.textContent = text.slice(index, index + query.length);
      fragment.append(mark);
      seen += 1;
      cursor = index + query.length;
      index = lower.indexOf(lowerQuery, cursor);
    }
    if (cursor < text.length) fragment.append(document.createTextNode(text.slice(cursor)));
    node.replaceWith(fragment);
  });
}

function revokeHtmlPreviewUrl(): void {
  if (htmlPreviewUrl.value.startsWith("blob:")) URL.revokeObjectURL(htmlPreviewUrl.value);
}

watch(
  () => (props.preview.kind === "markdown" && !props.previewEditing ? props.preview.html : ""),
  async () => {
    if (props.preview.kind !== "markdown" || props.previewEditing) return;
    await nextTick();
    await rewriteRelativeResources(contentRef.value as HTMLElement, props.rootHandle, props.basePathParts, props.createObjectUrl);
    applyMarkdownSearchMarks();
  },
  { flush: "post" }
);

watch(searchMatches, matches => {
  activeSearchIndex.value = matches.length ? 0 : -1;
  if (props.preview.kind === "markdown") nextTick(applyMarkdownSearchMarks);
  if (matches.length) nextTick(scrollToActiveSearchMatch);
});

watch(activeSearchIndex, () => {
  if (props.preview.kind === "markdown") nextTick(applyMarkdownSearchMarks);
});

watch(
  () => props.preview,
  () => {
    searchPanelOpen.value = false;
    searchKeyword.value = "";
    activeSearchIndex.value = -1;
    lineJumpInput.value = "";
  }
);

watch(
  () => props.jumpLineRequest.token,
  async () => {
    if (!props.jumpLineRequest.line) return;
    await nextTick();
    scrollToLine(props.jumpLineRequest.line);
  }
);

watch(
  () => (props.preview.kind === "html" && !props.previewEditing ? props.preview.html || "" : ""),
  async html => {
    if (props.preview.kind !== "html" || props.previewEditing) {
      clearHtmlPreviewUrl();
      return;
    }
    setHtmlPreviewUrl(await rewriteHtmlRelativeResources(html, props.rootHandle, props.basePathParts, props.createObjectUrl));
  },
  { immediate: true }
);

onMounted(() => {
  window.addEventListener("message", handlePreviewMessage);
  window.addEventListener("keydown", handleSearchShortcut);
});
onUnmounted(() => {
  window.removeEventListener("message", handlePreviewMessage);
  window.removeEventListener("keydown", handleSearchShortcut);
  revokeHtmlPreviewUrl();
});
</script>
