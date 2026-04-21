<template>
  <component :is="iconComponent" :size="18" :stroke-width="2" aria-hidden="true" />
</template>

<script setup lang="ts">
import {
  Archive,
  Braces,
  Copy,
  CornerUpLeft,
  Download,
  File,
  FileAudio,
  FileCode2,
  FileSearch,
  FileText,
  FileType,
  FileVideo,
  Folder,
  FolderOpen,
  FolderSearch,
  HardDrive,
  Home,
  Image,
  Maximize,
  Minimize,
  PanelLeftClose,
  PanelLeftOpen,
  RefreshCw,
  ArrowUp
} from "lucide-vue-next";
import { computed } from "vue";

const props = defineProps<{ name: string }>();

const icons = {
  archive: Archive,
  braces: Braces,
  copy: Copy,
  "corner-up-left": CornerUpLeft,
  download: Download,
  file: File,
  "file-audio": FileAudio,
  "file-code-2": FileCode2,
  "file-search": FileSearch,
  "file-text": FileText,
  "file-type": FileType,
  "file-video": FileVideo,
  folder: Folder,
  "folder-open": FolderOpen,
  "folder-search": FolderSearch,
  "hard-drive": HardDrive,
  home: Home,
  image: Image,
  maximize: Maximize,
  minimize: Minimize,
  "panel-left-close": PanelLeftClose,
  "panel-left-open": PanelLeftOpen,
  "refresh-cw": RefreshCw,
  "arrow-up": ArrowUp
};

const iconComponent = computed(() => icons[props.name as keyof typeof icons] || File);
</script>
