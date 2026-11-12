<template>
  <div
    :id="id"
    role="listbox"
    :aria-label="label"
    :data-track-field-id="fieldId"
    data-track-form-id="service-request"
    class="absolute left-0 top-full z-20 mt-1 max-h-64 w-full overflow-auto rounded-md border border-slate-300 bg-white p-1 shadow-lg"
  >
    <button
      v-for="option in options"
      :id="`${id}-${option.value}`"
      :key="option.value"
      type="button"
      role="option"
      tabindex="-1"
      :aria-selected="highlightedValue === option.value"
      :data-track-field-id="fieldId"
      data-track-form-id="service-request"
      :class="
        highlightedValue === option.value
          ? 'bg-slate-900 text-white'
          : 'text-slate-900 hover:bg-slate-100'
      "
      class="flex min-h-11 w-full items-center justify-between gap-3 rounded px-3 py-2 text-left text-sm"
      @pointerdown.prevent
      @click="$emit('select', option)"
    >
      <span>{{ option.label }}</span>
      <span class="font-mono text-xs">{{ option.value }}</span>
    </button>
    <p v-if="options.length === 0" class="px-3 py-2 text-sm text-slate-600" role="status">
      Žádná odpovídající možnost. Upravte zadaný text.
    </p>
  </div>
</template>

<script setup lang="ts">
import type { FieldId, FieldOption } from '~/lib/service-request'

defineProps<{
  id: string
  label: string
  fieldId: FieldId
  options: readonly FieldOption[]
  highlightedValue: string
}>()

defineEmits<{ select: [option: FieldOption] }>()
</script>
