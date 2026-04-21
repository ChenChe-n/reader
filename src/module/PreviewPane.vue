<template>
  <section class="viewer">
    <div class="viewer-head">
      <button class="button icon-only viewer-expand-toggle" title="展开文件区" @click="$emit('expand')">
        <IconView name="ico-panel-open" />
      </button>
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
      <iframe v-else-if="preview.kind === 'html'" class="html-frame" :srcdoc="preview.html" :sandbox="iframeSandbox"></iframe>
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
import type { FileSystemDirectoryHandleLike, PreviewState } from "../types";
import { rewriteRelativeResources } from "../utils/resourceRewriter";
import IconView from "./IconView.vue";

const props = defineProps<{
  preview: PreviewState;
  fileTitle: string;
  fileMeta: string;
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
const iframeSandbox = "allow-forms allow-popups allow-same-origin allow-scripts allow-modals";
const fullscreenTip = computed(() => (props.isPreviewMaximized ? "还原预览" : "最大化预览"));

/**
 * 滚动预览区域到顶部。
 * @returns 无返回值。
 */
function scrollToTop(): void {
  contentRef.value?.scrollTo({ top: 0, behavior: "smooth" });
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
