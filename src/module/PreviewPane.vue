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
        <button class="button icon-only" title="下载当前文件" :disabled="!hasFile" @click="$emit('download')">
          <IconView name="ico-download" />
        </button>
      </div>
    </div>

    <div
      v-if="!previewEditing"
      ref="contentRef"
      :class="['content', { 'content-frame': preview.kind === 'html' || preview.kind === 'document' }]"
      @click="handleContentClick"
    >
      <div v-if="preview.kind === 'notice'" class="notice">{{ preview.message }}</div>
      <article v-else-if="preview.kind === 'markdown'" class="markdown" v-html="preview.html"></article>
      <LineTextViewer v-else-if="preview.kind === 'lineText'" ref="lineViewerRef" :document="preview.lineText" />
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
      <div v-else-if="preview.kind === 'media'" class="media-stage">
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
import type { LineMode } from "./reader/workerLineStyles";

const draftText = defineModel<string>("draftText", { required: true });

const props = defineProps<{
  preview: PreviewState;
  fileTitle: string;
  fileMeta: string;
  previewTiming: PreviewTiming;
  hasText: boolean;
  hasFile: boolean;
  canSave: boolean;
  canEditPreview: boolean;
  canToggleHtmlPreview: boolean;
  htmlPreviewMode: "web" | "code";
  previewEditing: boolean;
  isPreviewMaximized: boolean;
  rootHandle: FileSystemDirectoryHandleLike | null;
  basePathParts: string[];
  createObjectUrl: (file: Blob) => string;
  editLineMode: LineMode;
}>();

const emit = defineEmits<{
  copy: [];
  download: [];
  save: [];
  expand: [];
  "toggle-fullscreen": [];
  "toggle-edit": [];
  "toggle-html-preview": [];
  "open-relative": [href: string];
}>();

const contentRef = ref<HTMLElement | null>(null);
const lineViewerRef = ref<InstanceType<typeof LineTextViewer> | null>(null);
const lineEditorRef = ref<InstanceType<typeof LineTextEditor> | null>(null);
const htmlPreviewUrl = ref("about:blank");
const iframeSandbox = "allow-forms allow-popups allow-scripts allow-modals allow-same-origin";
const fullscreenTip = computed(() => (props.isPreviewMaximized ? "还原预览" : "最大化预览"));
const editToggleTip = computed(() => (props.previewEditing ? "关闭编辑" : "编辑"));
const htmlPreviewToggleTip = computed(() => (props.htmlPreviewMode === "web" ? "代码预览" : "网页预览"));
const readTimingLabel = computed(() => formatDuration(props.previewTiming.readMs));
const processTimingLabel = computed(() => formatDuration(props.previewTiming.processMs));

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

function revokeHtmlPreviewUrl(): void {
  if (htmlPreviewUrl.value.startsWith("blob:")) URL.revokeObjectURL(htmlPreviewUrl.value);
}

watch(
  () => (props.preview.kind === "markdown" && !props.previewEditing ? props.preview.html : ""),
  async () => {
    if (props.preview.kind !== "markdown" || props.previewEditing) return;
    await nextTick();
    await rewriteRelativeResources(contentRef.value as HTMLElement, props.rootHandle, props.basePathParts, props.createObjectUrl);
  },
  { flush: "post" }
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

onMounted(() => window.addEventListener("message", handlePreviewMessage));
onUnmounted(() => {
  window.removeEventListener("message", handlePreviewMessage);
  revokeHtmlPreviewUrl();
});
</script>
