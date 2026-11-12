<template>
  <div class="grid min-h-10 items-start text-xs leading-5">
    <p
      :id="`${id}-hint`"
      class="col-start-1 row-start-1 text-slate-600"
      :class="{ invisible: error }"
    >
      {{ hint }}
    </p>
    <p v-if="error" :id="`${id}-error`" class="col-start-1 row-start-1 font-medium text-red-700">
      {{ error }}
    </p>
  </div>
</template>

<script setup lang="ts">
defineProps<{ id: string; hint?: string; error?: string }>()
</script>
