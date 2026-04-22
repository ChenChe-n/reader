import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";

export type ThemeMode = "system" | "light" | "dark" | "custom";

export interface ThemePalette {
  background: string;
  surface: string;
  text: string;
  accent: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  custom: ThemePalette;
}

const STORAGE_KEY = "reader.theme";

const LIGHT: ThemePalette = {
  background: "#e0e0e0",
  surface: "#ffffff",
  text: "#1f2937",
  accent: "#2563eb"
};

const DARK: ThemePalette = {
  background: "#111827",
  surface: "#1f2937",
  text: "#f8fafc",
  accent: "#60a5fa"
};

const DEFAULT_CUSTOM: ThemePalette = {
  background: "#f5f0e8",
  surface: "#fffaf2",
  text: "#243041",
  accent: "#0f766e"
};

const settings = reactive<ThemeSettings>(readThemeSettings());
const mediaQuery = ref<MediaQueryList | null>(null);
const prefersDark = ref(false);
const effectiveMode = computed<"light" | "dark" | "custom">(() => {
  if (settings.mode === "system") return prefersDark.value ? "dark" : "light";
  return settings.mode;
});
const activePalette = computed(() => {
  if (effectiveMode.value === "dark") return DARK;
  if (effectiveMode.value === "custom") return settings.custom;
  return LIGHT;
});

/**
 * 提供全局主题设置和应用逻辑。
 * @returns 主题状态和操作。
 */
export function useThemeState() {
  onMounted(() => {
    mediaQuery.value = window.matchMedia("(prefers-color-scheme: dark)");
    prefersDark.value = mediaQuery.value.matches;
    mediaQuery.value.addEventListener("change", syncSystemTheme);
    applyTheme(activePalette.value, effectiveMode.value);
  });

  onUnmounted(() => {
    mediaQuery.value?.removeEventListener("change", syncSystemTheme);
  });

  watch(
    () => [settings.mode, settings.custom.background, settings.custom.surface, settings.custom.text, settings.custom.accent],
    () => {
      writeThemeSettings(settings);
      applyTheme(activePalette.value, effectiveMode.value);
    },
    { immediate: true }
  );

  watch(activePalette, palette => applyTheme(palette, effectiveMode.value));

  /**
   * 切换主题模式。
   * @param mode 主题模式。
   * @returns 无返回值。
   */
  function setMode(mode: ThemeMode): void {
    settings.mode = mode;
  }

  /**
   * 更新自定义调色板中的一个主体色。
   * @param key 颜色键。
   * @param value 十六进制颜色。
   * @returns 无返回值。
   */
  function setCustomColor(key: keyof ThemePalette, value: string): void {
    if (!isHexColor(value)) return;
    settings.custom[key] = value;
    settings.mode = "custom";
  }

  /**
   * 重置自定义主题颜色。
   * @returns 无返回值。
   */
  function resetCustom(): void {
    Object.assign(settings.custom, DEFAULT_CUSTOM);
    settings.mode = "custom";
  }

  return {
    settings,
    effectiveMode,
    activePalette,
    setMode,
    setCustomColor,
    resetCustom
  };
}

function syncSystemTheme(event: MediaQueryListEvent): void {
  prefersDark.value = event.matches;
  if (settings.mode === "system") applyTheme(activePalette.value, effectiveMode.value);
}

function applyTheme(palette: ThemePalette, mode: "light" | "dark" | "custom"): void {
  const root = document.documentElement;
  root.dataset.theme = mode;
  root.style.colorScheme = mode === "dark" ? "dark" : "light";
  root.style.setProperty("--theme-bg", palette.background);
  root.style.setProperty("--theme-panel", palette.surface);
  root.style.setProperty("--theme-text", palette.text);
  root.style.setProperty("--theme-accent", palette.accent);
}

function readThemeSettings(): ThemeSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultThemeSettings();
    const value = JSON.parse(raw) as Partial<ThemeSettings>;
    return {
      mode: isThemeMode(value.mode) ? value.mode : "system",
      custom: normalizePalette(value.custom)
    };
  } catch {
    return defaultThemeSettings();
  }
}

function writeThemeSettings(value: ThemeSettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

function defaultThemeSettings(): ThemeSettings {
  return {
    mode: "system",
    custom: { ...DEFAULT_CUSTOM }
  };
}

function normalizePalette(value: Partial<ThemePalette> | undefined): ThemePalette {
  return {
    background: isHexColor(value?.background) ? value.background : DEFAULT_CUSTOM.background,
    surface: isHexColor(value?.surface) ? value.surface : DEFAULT_CUSTOM.surface,
    text: isHexColor(value?.text) ? value.text : DEFAULT_CUSTOM.text,
    accent: isHexColor(value?.accent) ? value.accent : DEFAULT_CUSTOM.accent
  };
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark" || value === "custom";
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
