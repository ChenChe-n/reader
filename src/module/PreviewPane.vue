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
        <button class="button icon-only" title="复制文本内容" :disabled="!hasText" @click="$emit('copy')">
          <IconView name="ico-copy" />
        </button>
        <button class="button icon-only" title="下载当前文件" :disabled="!hasFile" @click="$emit('download')">
          <IconView name="ico-download" />
        </button>
      </div>
    </div>

    <div ref="contentRef" class="content" @click="handleContentClick">
      <div v-if="preview.kind === 'notice'" class="notice">{{ preview.message }}</div>
      <article v-else-if="preview.kind === 'markdown'" class="markdown" v-html="preview.html"></article>
      <pre v-else-if="preview.kind === 'code'" class="code-view">{{ preview.text }}</pre>
      <LineTextViewer v-else-if="preview.kind === 'lineText' && preview.lineText" ref="lineViewerRef" :document="preview.lineText" />
      <iframe v-else-if="preview.kind === 'html'" class="html-frame" :srcdoc="preview.html" :sandbox="preview.sandbox || iframeSandbox"></iframe>
      <div v-else-if="preview.kind === 'media'" class="media-stage">
        <img v-if="preview.mediaKind === 'image'" :src="preview.url" :alt="preview.fileName" />
        <video v-else-if="preview.mediaKind === 'video'" :src="preview.url" controls playsinline></video>
        <audio v-else :src="preview.url" controls></audio>
      </div>
      <div v-else class="empty">
        <div class="empty-inner">
          <div class="empty-icon"><IconView name="dir-search" /></div>
          <h2>{{ preview.title }}</h2>
          <p>{{ preview.message }}</p>
        </div>
      </div>
    </div>

    <div class="preview-corner-actions">
      <button class="svg-action" type="button" data-tooltip="返回顶部" aria-label="返回顶部" @click="scrollToTop">
        <IconView name="ico-up" />
      </button>
      <button class="svg-action" type="button" :data-tooltip="fullscreenTip" :aria-label="fullscreenTip" @click="$emit('toggle-fullscreen')">
        <IconView :name="isPreviewMaximized ? 'ico-minimize' : 'ico-maximize'" />
      </button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, ref, watch } from "vue";
import { isAnchorOnly, shouldResolveLocalResource } from "../api/localFiles";
import type { FileSystemDirectoryHandleLike, PreviewState, PreviewTiming } from "../types";
import { rewriteRelativeResources } from "../utils/resourceRewriter";
import IconView from "./IconView.vue";
import LineTextViewer from "./LineTextViewer.vue";

const props = defineProps<{
  preview: PreviewState;
  fileTitle: string;
  fileMeta: string;
  previewTiming: PreviewTiming;
  hasText: boolean;
  hasFile: boolean;
  isPreviewMaximized: boolean;
  rootHandle: FileSystemDirectoryHandleLike | null;
  basePathParts: string[];
  createObjectUrl: (file: Blob) => string;
}>();

const emit = defineEmits<{
  copy: [];
  download: [];
  expand: [];
  "toggle-fullscreen": [];
  "open-relative": [href: string];
}>();

const contentRef = ref<HTMLElement | null>(null);
const lineViewerRef = ref<InstanceType<typeof LineTextViewer> | null>(null);
const iframeSandbox = "allow-forms allow-popups allow-same-origin allow-scripts allow-modals";
const fullscreenTip = computed(() => (props.isPreviewMaximized ? "还原预览" : "最大化预览"));
const readTimingLabel = computed(() => formatDuration(props.previewTiming.readMs));
const processTimingLabel = computed(() => formatDuration(props.previewTiming.processMs));

/**
 * 滚动预览区域到顶部。
 * @returns 无返回值。
 */
function scrollToTop(): void {
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

watch(
  () => props.preview.html,
  async () => {
    if (props.preview.kind !== "markdown") return;
    await nextTick();
    await rewriteRelativeResources(contentRef.value as HTMLElement, props.rootHandle, props.basePathParts, props.createObjectUrl);
  },
  { flush: "post" }
);

onMounted(() => window.addEventListener("message", handlePreviewMessage));
onUnmounted(() => window.removeEventListener("message", handlePreviewMessage));
</script>
