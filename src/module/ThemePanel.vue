<template>
  <section class="theme-panel" aria-label="配色设置">
    <header class="theme-panel-head">
      <div>
        <h2>配色</h2>
        <p>{{ modeLabel }}</p>
      </div>
      <button class="button icon-only" type="button" title="关闭" @click="$emit('close')">
        <IconView name="ico-panel-close" />
      </button>
    </header>

    <div class="theme-mode-row" role="group" aria-label="主题模式">
      <button
        v-for="option in modeOptions"
        :key="option.value"
        type="button"
        :class="['theme-mode-button', { active: settings.mode === option.value }]"
        @click="setMode(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="theme-color-grid">
      <label v-for="item in colorFields" :key="item.key" class="theme-color-field">
        <span>{{ item.label }}</span>
        <input
          type="color"
          :value="settings.custom[item.key]"
          :aria-label="item.label"
          @input="setCustomColor(item.key, $event)"
        />
      </label>
    </div>

    <div class="theme-panel-actions">
      <button class="button" type="button" @click="resetCustom">重置自定义</button>
      <button class="button primary" type="button" @click="$emit('close')">完成</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { ThemeMode, ThemePalette, ThemeSettings } from "../theme/themeState";
import IconView from "./IconView.vue";

const props = defineProps<{
  settings: ThemeSettings;
  effectiveMode: "light" | "dark" | "custom";
}>();

const emit = defineEmits<{
  close: [];
  "set-mode": [mode: ThemeMode];
  "set-custom-color": [key: keyof ThemePalette, value: string];
  "reset-custom": [];
}>();

const modeOptions: Array<{ value: ThemeMode; label: string }> = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "白天" },
  { value: "dark", label: "黑夜" },
  { value: "custom", label: "自定义" }
];

const colorFields: Array<{ key: keyof ThemePalette; label: string }> = [
  { key: "background", label: "背景" },
  { key: "surface", label: "面板" },
  { key: "text", label: "文字" },
  { key: "accent", label: "主体色" }
];

const modeLabel = computed(() => {
  if (props.settings.mode === "system") return props.effectiveMode === "dark" ? "正在使用系统黑夜配色" : "正在使用系统白天配色";
  return modeOptions.find(option => option.value === props.settings.mode)?.label || "";
});

function setMode(mode: ThemeMode): void {
  emit("set-mode", mode);
}

function setCustomColor(key: keyof ThemePalette, event: Event): void {
  emit("set-custom-color", key, (event.target as HTMLInputElement).value);
}

function resetCustom(): void {
  emit("reset-custom");
}
</script>
