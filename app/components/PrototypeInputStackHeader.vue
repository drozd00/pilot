<template>
  <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-start gap-3">
      <div
        v-if="step"
        class="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 bg-slate-50 text-xs font-semibold tracking-[0.24em] text-slate-600"
      >
        {{ step }}
      </div>

      <div class="space-y-1.5">
        <label
          :for="labelFor"
          class="block text-sm font-semibold uppercase tracking-[0.16em] text-slate-600"
        >
          {{ label }}
        </label>

        <p v-if="description" class="max-w-2xl text-sm leading-6 text-slate-500">
          {{ description }}
        </p>
      </div>
    </div>

    <div
      v-if="showCommandHint"
      class="inline-flex items-center gap-2 self-start whitespace-nowrap rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em] text-slate-500 sm:self-center"
    >
      <span
        class="rounded border border-slate-300 bg-white px-1.5 py-0.5 font-mono text-[10px] tracking-[0.08em] text-slate-700"
      >
        Enter
      </span>
      další pole
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    labelFor?: string
    step?: string
    description?: string
    showCommandHint?: boolean
  }>(),
  {
    labelFor: undefined,
    step: undefined,
    description: undefined,
    showCommandHint: true,
  },
)
</script>
