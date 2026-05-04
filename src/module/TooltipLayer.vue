<template>
  <Teleport to="body">
    <div
      v-if="visible"
      ref="tooltipRef"
      class="app-tooltip"
      :class="`app-tooltip-${placement}`"
      role="tooltip"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
    >
      {{ text }}
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { nextTick, onMounted, onUnmounted, ref } from "vue";

type TooltipPlacement = "top" | "bottom";

const tooltipRef = ref<HTMLElement | null>(null);
const visible = ref(false);
const text = ref("");
const placement = ref<TooltipPlacement>("top");
const position = ref({ left: 0, top: 0 });
let activeElement: HTMLElement | null = null;
let showTimer = 0;

function handlePointerOver(event: PointerEvent): void {
  const target = tooltipTarget(event.target);
  if (!target || target === activeElement) return;
  scheduleTooltip(target);
}

function handleMouseOver(event: MouseEvent): void {
  const target = tooltipTarget(event.target);
  if (!target || target === activeElement) return;
  scheduleTooltip(target);
}

function handleFocusIn(event: FocusEvent): void {
  const target = tooltipTarget(event.target);
  if (target) scheduleTooltip(target, 120);
}

function handlePointerOut(event: PointerEvent): void {
  const next = event.relatedTarget as Node | null;
  if (activeElement && next && activeElement.contains(next)) return;
  hideTooltip();
}

function handleMouseOut(event: MouseEvent): void {
  const next = event.relatedTarget as Node | null;
  if (activeElement && next && activeElement.contains(next)) return;
  hideTooltip();
}

function handleFocusOut(): void {
  hideTooltip();
}

function handleScroll(): void {
  hideTooltip();
}

function handleKeydown(event: KeyboardEvent): void {
  if (event.key === "Escape") hideTooltip();
}

function scheduleTooltip(target: HTMLElement, delay = 360): void {
  const label = tooltipText(target);
  if (!label || target.matches(":disabled,[aria-disabled='true']")) return;
  window.clearTimeout(showTimer);
  activeElement = target;
  text.value = label;
  showTimer = window.setTimeout(() => {
    visible.value = true;
    void nextTick(() => placeTooltip(target));
  }, delay);
}

function hideTooltip(): void {
  window.clearTimeout(showTimer);
  visible.value = false;
  activeElement = null;
}

function placeTooltip(target: HTMLElement): void {
  const tip = tooltipRef.value;
  if (!tip || !visible.value) return;
  const gap = 10;
  const margin = 8;
  const rect = target.getBoundingClientRect();
  const tipRect = tip.getBoundingClientRect();
  const left = clamp(rect.left + rect.width / 2 - tipRect.width / 2, margin, window.innerWidth - tipRect.width - margin);
  const topAbove = rect.top - tipRect.height - gap;
  if (topAbove >= margin) {
    placement.value = "top";
    position.value = { left, top: topAbove };
    return;
  }
  placement.value = "bottom";
  position.value = { left, top: Math.min(rect.bottom + gap, window.innerHeight - tipRect.height - margin) };
}

function tooltipTarget(target: EventTarget | null): HTMLElement | null {
  const candidate = target instanceof Element ? target.closest("[title], [data-tooltip], [data-native-title]") : null;
  if (!(candidate instanceof HTMLElement)) return null;
  const element = candidate;
  if (element.hasAttribute("title")) {
    const title = element.getAttribute("title") || "";
    element.dataset.nativeTitle = title;
    element.removeAttribute("title");
    if (!element.getAttribute("aria-label")) element.setAttribute("aria-label", title);
  }
  return element;
}

function tooltipText(element: HTMLElement): string {
  return (element.dataset.tooltip || element.dataset.nativeTitle || "").trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

onMounted(() => {
  document.addEventListener("pointerover", handlePointerOver);
  document.addEventListener("pointerout", handlePointerOut);
  document.addEventListener("mouseover", handleMouseOver);
  document.addEventListener("mouseout", handleMouseOut);
  document.addEventListener("focusin", handleFocusIn);
  document.addEventListener("focusout", handleFocusOut);
  document.addEventListener("scroll", handleScroll, true);
  window.addEventListener("resize", hideTooltip);
  window.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("pointerover", handlePointerOver);
  document.removeEventListener("pointerout", handlePointerOut);
  document.removeEventListener("mouseover", handleMouseOver);
  document.removeEventListener("mouseout", handleMouseOut);
  document.removeEventListener("focusin", handleFocusIn);
  document.removeEventListener("focusout", handleFocusOut);
  document.removeEventListener("scroll", handleScroll, true);
  window.removeEventListener("resize", hideTooltip);
  window.removeEventListener("keydown", handleKeydown);
  window.clearTimeout(showTimer);
});
</script>
