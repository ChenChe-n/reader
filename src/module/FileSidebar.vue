<template>
  <aside class="sidebar">
    <div class="sidebar-head">
      <div class="nav-row">
        <button class="button" title="返回上一级" :disabled="!canGoUp" @click="$emit('go-up')">
          <IconView name="ico-back" />
          返回上一级
        </button>
        <button class="button icon-only" title="刷新当前目录" :disabled="!hasRoot" @click="$emit('reload')">
          <IconView name="ico-refresh" />
        </button>
        <button class="button icon-only" title="选择文件夹" @click="$emit('open-directory')">
          <IconView name="dir-open" />
        </button>
        <button class="button icon-only" title="回到根目录" :disabled="!hasRoot" @click="$emit('home')">
          <IconView name="ico-home" />
        </button>
        <button class="button icon-only" title="配色设置" @click="$emit('theme')">
          <IconView name="ico-theme" />
        </button>
        <button class="button icon-only collapse-toggle" title="折叠文件区" @click="$emit('collapse')">
          <IconView name="ico-panel-close" />
        </button>
      </div>
      <input v-model="keywordModel" class="search" type="search" placeholder="筛选文件或文件夹" />
    </div>

    <div class="crumbs">
      <IconView name="ico-drive" />
      <span>{{ pathLabel }}</span>
    </div>

    <div ref="fileListRef" class="file-list" @scroll="rememberCurrentScroll">
      <div v-if="!hasCurrentDirectory" class="empty">
        <div class="empty-inner"><p>请选择一个文件夹</p></div>
      </div>
      <div v-else-if="!entries.length" class="empty">
        <div class="empty-inner"><p>没有匹配的项目</p></div>
      </div>
      <button
        v-for="item in entries"
        v-else
        :key="`${item.kind}:${item.name}`"
        type="button"
        :title="item.name"
        :ref="element => setEntryRef(item.name, element)"
        :class="['entry', item.kind === 'directory' ? 'folder' : 'file', { active: selectedName === item.name }]"
        @click="$emit('open-entry', item)"
      >
        <span class="icon"><IconView :name="iconFor(item)" /></span>
        <span class="entry-name">{{ item.name }}</span>
        <span class="entry-meta">{{ metaFor(item) }}</span>
      </button>
    </div>
  </aside>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUpdate, ref, watch } from "vue";
import type { LocalEntry } from "../types";
import { iconFor, metaFor } from "../utils/fileKind";
import IconView from "./IconView.vue";

const props = defineProps<{
  entries: LocalEntry[];
  selectedName: string;
  keyword: string;
  pathLabel: string;
  hasRoot: boolean;
  hasCurrentDirectory: boolean;
  canGoUp: boolean;
}>();

const emit = defineEmits<{
  "update:keyword": [value: string];
  "open-directory": [];
  "open-entry": [item: LocalEntry];
  reload: [];
  home: [];
  theme: [];
  "go-up": [];
  collapse: [];
}>();

const keywordModel = computed({
  get: () => props.keyword,
  set: value => emit("update:keyword", value)
});

const entryRefs = ref<Record<string, HTMLElement>>({});
const fileListRef = ref<HTMLElement | null>(null);
const scrollPositions = new Map<string, number>();

/**
 * 记录文件列表项元素，用于选中项自动滚动。
 * @param name 条目名称。
 * @param element 条目 DOM 或组件实例。
 * @returns 无返回值。
 */
function setEntryRef(name: string, element: Element | unknown): void {
  if (element instanceof HTMLElement) entryRefs.value[name] = element;
}

/**
 * 将当前选中的文件滚动到侧栏可视区域内。
 * @returns 异步完成信号。
 */
async function scrollSelectedEntryIntoView(): Promise<void> {
  await nextTick();
  if (!props.selectedName) return;
  entryRefs.value[props.selectedName]?.scrollIntoView({ block: "nearest" });
}

/**
 * 记录当前目录列表滚动位置。
 * @returns 无返回值。
 */
function rememberCurrentScroll(): void {
  if (!fileListRef.value) return;
  scrollPositions.set(props.pathLabel, fileListRef.value.scrollTop);
}

/**
 * 恢复指定目录的列表滚动位置。
 * @param path 目录路径标签。
 * @returns 异步完成信号。
 */
async function restoreDirectoryScroll(path: string): Promise<void> {
  await nextTick();
  if (!fileListRef.value) return;
  fileListRef.value.scrollTop = scrollPositions.get(path) ?? 0;
}

onBeforeUpdate(() => {
  entryRefs.value = {};
});

watch(() => props.selectedName, () => {
  void scrollSelectedEntryIntoView();
});

watch(() => props.pathLabel, (path, oldPath) => {
  if (oldPath && fileListRef.value) scrollPositions.set(oldPath, fileListRef.value.scrollTop);
  void restoreDirectoryScroll(path);
});
</script>
