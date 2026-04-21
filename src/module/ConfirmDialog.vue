<template>
  <Teleport to="body">
    <div v-if="visible" class="confirm-mask" role="presentation">
      <section class="confirm-dialog" role="dialog" aria-modal="true" :aria-labelledby="titleId">
        <h2 :id="titleId">{{ title }}</h2>
        <p>{{ message }}</p>
        <div class="confirm-actions">
          <button class="button" type="button" @click="$emit('cancel')">取消</button>
          <button class="button primary" type="button" autofocus @click="$emit('confirm')">继续读取</button>
        </div>
      </section>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
const titleId = "confirm-dialog-title";

defineProps<{
  visible: boolean;
  title: string;
  message: string;
}>();

defineEmits<{
  confirm: [];
  cancel: [];
}>();
</script>
