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
  Palette,
  RefreshCw,
  ArrowUp,
  Save,
  SquarePen,
  Globe2,
  CodeXml
} from "lucide-vue-next";
import { computed } from "vue";
import type { ReaderIconName } from "../types";

const props = defineProps<{ name: ReaderIconName }>();

const icons = {
  "dir-default": Folder,
  "dir-open": FolderOpen,
  "dir-search": FolderSearch,
  "file-archive": Archive,
  "file-audio": FileAudio,
  "file-code": FileCode2,
  "file-default": File,
  "file-image": Image,
  "file-json": Braces,
  "file-plain": FileType,
  "file-search": FileSearch,
  "file-text": FileText,
  "file-video": FileVideo,
  "ico-back": CornerUpLeft,
  "ico-copy": Copy,
  "ico-download": Download,
  "ico-drive": HardDrive,
  "ico-home": Home,
  "ico-maximize": Maximize,
  "ico-minimize": Minimize,
  "ico-panel-close": PanelLeftClose,
  "ico-panel-open": PanelLeftOpen,
  "ico-theme": Palette,
  "ico-refresh": RefreshCw,
  "ico-up": ArrowUp,
  "ico-save": Save,
  "ico-edit": SquarePen,
  "ico-web": Globe2,
  "ico-code": CodeXml
};

const iconComponent = computed(() => icons[props.name] || File);
</script>
