<script setup lang="ts">
defineProps<{ variant: 'A' | 'B' }>()
</script>

<template>
  <span
    :aria-label="`Rozhraní ${variant}`"
    :title="`Rozhraní ${variant}`"
    role="img"
    class="inline-flex size-5 shrink-0 items-center justify-center rounded-full border border-slate-300 text-xs font-medium text-slate-500"
  >
    <span aria-hidden="true">i</span>
  </span>
</template>
