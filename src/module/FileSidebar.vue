<template>
  <aside class="sidebar">
    <div class="sidebar-head">
      <div class="nav-row">
        <button class="button" title="返回上一级" :disabled="!canGoUp" @click="$emit('go-up')">
          <IconView name="corner-up-left" />
          返回上一级
        </button>
        <button class="button icon-only" title="刷新当前目录" :disabled="!hasRoot" @click="$emit('reload')">
          <IconView name="refresh-cw" />
        </button>
        <button class="button icon-only" title="选择文件夹" @click="$emit('open-directory')">
          <IconView name="folder-open" />
        </button>
        <button class="button icon-only" title="回到根目录" :disabled="!hasRoot" @click="$emit('home')">
          <IconView name="home" />
        </button>
        <button class="button icon-only collapse-toggle" title="折叠文件区" @click="$emit('collapse')">
          <IconView name="panel-left-close" />
        </button>
      </div>
      <input v-model="keywordModel" class="search" type="search" placeholder="筛选文件或文件夹" />
    </div>

    <div class="crumbs">
      <IconView name="hard-drive" />
      <span>{{ pathLabel }}</span>
    </div>

    <div class="file-list">
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
import { computed } from "vue";
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
  "go-up": [];
  collapse: [];
}>();

const keywordModel = computed({
  get: () => props.keyword,
  set: value => emit("update:keyword", value)
});
</script>
