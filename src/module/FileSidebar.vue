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
        <button
          type="button"
          :class="['button', 'icon-only', { active: globalSearchOpen }]"
          title="全局搜索"
          :aria-expanded="globalSearchOpen"
          @click="toggleGlobalSearch"
        >
          <IconView name="file-search" />
        </button>
        <button class="button icon-only" title="配色设置" @click="$emit('theme')">
          <IconView name="ico-theme" />
        </button>
        <button class="button icon-only collapse-toggle" title="折叠文件区" @click="$emit('collapse')">
          <IconView name="ico-panel-close" />
        </button>
      </div>
      <input v-model="keywordModel" class="search" type="search" placeholder="筛选文件或文件夹" />
      <form v-if="globalSearchOpen" class="global-search" @submit.prevent="$emit('start-global-search')">
        <div class="global-search-row">
          <input
            ref="globalSearchInputRef"
            v-model="globalSearch.keyword"
            class="search global-search-input"
            type="search"
            placeholder="全局搜索"
            :disabled="globalSearch.running || !hasCurrentDirectory"
          />
          <button v-if="!globalSearch.running" class="button icon-only" type="submit" title="开始全局搜索" :disabled="!canStartGlobalSearch">
            <IconView name="file-search" />
          </button>
          <button v-else class="button icon-only" type="button" title="取消全局搜索" @click="$emit('cancel-global-search')">
            <IconView name="ico-panel-close" />
          </button>
        </div>
        <div class="global-search-options">
          <div class="global-search-mode" role="group" aria-label="全局搜索模式">
            <button
              type="button"
              :class="['global-search-mode-button', { active: globalSearch.mode === 'name' }]"
              :disabled="globalSearch.running"
              @click="globalSearch.mode = 'name'"
            >
              名称
            </button>
            <button
              type="button"
              :class="['global-search-mode-button', { active: globalSearch.mode === 'content' }]"
              :disabled="globalSearch.running"
              @click="globalSearch.mode = 'content'"
            >
              内容
            </button>
          </div>
          <button
            type="button"
            :class="['global-search-toggle', { active: globalSearch.includeSubdirectories }]"
            :disabled="globalSearch.running"
            :aria-pressed="globalSearch.includeSubdirectories"
            @click="globalSearch.includeSubdirectories = !globalSearch.includeSubdirectories"
          >
            <span class="global-search-switch" aria-hidden="true"></span>
            子目录
          </button>
          <button
            class="global-search-clear"
            type="button"
            :disabled="globalSearch.running || !globalSearch.results.length"
            @click="$emit('clear-global-search')"
          >
            清空
          </button>
        </div>
        <div v-if="globalSearch.status" class="global-search-status">
          <span>{{ globalSearch.status }}</span>
          <span v-if="globalSearch.mode === 'content'">已查 {{ globalSearch.searchedFiles }} 文件，跳过 {{ globalSearch.skippedFiles }}</span>
        </div>
      </form>
    </div>

    <div class="crumbs">
      <IconView name="ico-drive" />
      <span>{{ pathLabel }}</span>
    </div>

    <div v-if="globalSearch.results.length" class="global-results">
      <button
        v-for="result in globalSearch.results"
        :key="result.id"
        type="button"
        class="global-result"
        :title="result.pathParts.join('/')"
        @click="$emit('open-global-result', result)"
      >
        <span class="icon"><IconView :name="iconForResult(result)" /></span>
        <span class="global-result-main">
          <span class="global-result-name">{{ result.name }}</span>
          <span class="global-result-path">{{ result.pathParts.join("/") }}</span>
          <span v-if="result.snippet" class="global-result-snippet">{{ result.snippet }}</span>
        </span>
        <span class="global-result-meta">{{ result.lineNumber ? `L${result.lineNumber}` : metaForResult(result) }}</span>
      </button>
    </div>

    <div v-else ref="fileListRef" class="file-list" @scroll="rememberCurrentScroll">
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
        :class="['entry', isContainer(item) ? 'folder' : 'file', { active: selectedName === item.name }]"
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
import type { GlobalSearchResult, GlobalSearchState, LocalEntry, ReaderIconName } from "../types";
import { extensionOf, iconFor, iconForExtension, isArchiveExtension, metaFor } from "../utils/fileKind";

function isContainer(item: LocalEntry): boolean {
  return item.kind === "directory" || (item.kind === "file" && isArchiveExtension(extensionOf(item.name)));
}
import IconView from "./IconView.vue";

const props = defineProps<{
  entries: LocalEntry[];
  selectedName: string;
  keyword: string;
  pathLabel: string;
  hasRoot: boolean;
  hasCurrentDirectory: boolean;
  canGoUp: boolean;
  globalSearch: GlobalSearchState;
}>();

const emit = defineEmits<{
  "update:keyword": [value: string];
  "open-directory": [];
  "open-entry": [item: LocalEntry];
  "open-global-result": [result: GlobalSearchResult];
  "start-global-search": [];
  "cancel-global-search": [];
  "clear-global-search": [];
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
const canStartGlobalSearch = computed(() => props.hasCurrentDirectory && props.globalSearch.keyword.trim().length > 0);

const globalSearchOpen = ref(false);
const globalSearchInputRef = ref<HTMLInputElement | null>(null);
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

function iconForResult(result: GlobalSearchResult): ReaderIconName {
  return result.kind === "directory" ? "dir-default" : iconForExtension(extensionOf(result.name));
}

function metaForResult(result: GlobalSearchResult): string {
  return result.kind === "directory" ? "目录" : "文件";
}

function toggleGlobalSearch(): void {
  globalSearchOpen.value = !globalSearchOpen.value;
  if (!globalSearchOpen.value) return;
  nextTick(() => {
    globalSearchInputRef.value?.focus();
  });
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
