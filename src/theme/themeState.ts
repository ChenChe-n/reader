import { computed, onMounted, onUnmounted, reactive, ref, watch } from "vue";
import { readConfigValue, writeConfigValue } from "../api/readerConfig";

export type ThemeMode = "system" | "light" | "dark" | "custom";

export interface ThemePalette {
  background: string;
  surface: string;
  text: string;
  accent: string;
  comment: string;
  keyword: string;
  function: string;
  string: string;
}

export interface ThemeSettings {
  mode: ThemeMode;
  custom: ThemePalette;
}

const THEME_SETTINGS_KEY = "reader.theme";

const LIGHT: ThemePalette = {
  background: "#ffffff",
  surface: "#f3f3f3",
  text: "#1f1f1f",
  accent: "#007acc",
  comment: "#008000",
  keyword: "#0000ff",
  function: "#795e26",
  string: "#a31515"
};

const DARK: ThemePalette = {
  background: "#1e1e1e",
  surface: "#252526",
  text: "#d4d4d4",
  accent: "#007acc",
  comment: "#6a9955",
  keyword: "#569cd6",
  function: "#dcdcaa",
  string: "#ce9178"
};

const DEFAULT_CUSTOM: ThemePalette = {
  background: "#1e1e1e",
  surface: "#252526",
  text: "#d4d4d4",
  accent: "#007acc",
  comment: "#6a9955",
  keyword: "#569cd6",
  function: "#dcdcaa",
  string: "#ce9178"
};

const settings = reactive<ThemeSettings>(defaultThemeSettings());
const mediaQuery = ref<MediaQueryList | null>(null);
const prefersDark = ref(false);
const settingsReady = ref(false);
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
    void restoreThemeSettings();
  });

  onUnmounted(() => {
    mediaQuery.value?.removeEventListener("change", syncSystemTheme);
  });

  watch(
    () => [
      settings.mode,
      settings.custom.background,
      settings.custom.surface,
      settings.custom.text,
      settings.custom.accent,
      settings.custom.comment,
      settings.custom.keyword,
      settings.custom.function,
      settings.custom.string
    ],
    () => {
      if (!settingsReady.value) return;
      void writeThemeSettings(settings);
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

/**
 * 恢复并应用保存的主题配置。
 * @returns 异步完成信号。
 */
async function restoreThemeSettings(): Promise<void> {
  mediaQuery.value = window.matchMedia("(prefers-color-scheme: dark)");
  prefersDark.value = mediaQuery.value.matches;
  mediaQuery.value.addEventListener("change", syncSystemTheme);
  const persisted = await readThemeSettings();
  Object.assign(settings, persisted);
  settingsReady.value = true;
  applyTheme(activePalette.value, effectiveMode.value);
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
  root.style.setProperty("--syntax-comment", palette.comment);
  root.style.setProperty("--syntax-keyword", palette.keyword);
  root.style.setProperty("--syntax-function", palette.function);
  root.style.setProperty("--syntax-string", palette.string);
}

async function readThemeSettings(): Promise<ThemeSettings> {
  try {
    const value = await readConfigValue<Partial<ThemeSettings>>(THEME_SETTINGS_KEY);
    if (!value) return defaultThemeSettings();
    return {
      mode: isThemeMode(value.mode) ? value.mode : "system",
      custom: normalizePalette(value.custom)
    };
  } catch {
    return defaultThemeSettings();
  }
}

async function writeThemeSettings(value: ThemeSettings): Promise<void> {
  await writeConfigValue<ThemeSettings>(THEME_SETTINGS_KEY, {
    mode: value.mode,
    custom: { ...value.custom }
  });
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
    accent: isHexColor(value?.accent) ? value.accent : DEFAULT_CUSTOM.accent,
    comment: isHexColor(value?.comment) ? value.comment : DEFAULT_CUSTOM.comment,
    keyword: isHexColor(value?.keyword) ? value.keyword : DEFAULT_CUSTOM.keyword,
    function: isHexColor(value?.function) ? value.function : DEFAULT_CUSTOM.function,
    string: isHexColor(value?.string) ? value.string : DEFAULT_CUSTOM.string
  };
}

function isThemeMode(value: unknown): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark" || value === "custom";
}

function isHexColor(value: unknown): value is string {
  return typeof value === "string" && /^#[0-9a-fA-F]{6}$/.test(value);
}
