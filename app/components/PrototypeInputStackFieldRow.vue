<template>
  <div
    class="grid gap-2 border-t border-slate-200 px-4 py-3 first:border-t-0 focus-within:bg-slate-50 sm:grid-cols-[9rem_minmax(0,1fr)] sm:gap-x-4"
    :class="field.kind === 'textarea' ? '' : 'lg:grid-cols-[9rem_minmax(0,1fr)_13rem]'"
  >
    <label :for="controlId" class="pt-2 text-sm font-medium text-slate-800">{{
      field.label
    }}</label>
    <div class="min-w-0 space-y-1.5">
      <PrototypeInputStackEnumInput
        v-if="field.options"
        :id="controlId"
        :field="field"
        :model-value="modelValue"
        :described-by="describedBy"
        :error="error"
        :disabled="disabled"
        @update:model-value="$emit('update:modelValue', $event)"
        @commit="$emit('commit', $event)"
      />
      <PrototypeInputStackTextInput
        v-else
        :id="controlId"
        :field="field"
        :model-value="modelValue"
        :described-by="describedBy"
        :error="error"
        :disabled="disabled"
        @update:model-value="$emit('update:modelValue', $event)"
        @commit="$emit('commit', $event)"
      />
    </div>
    <FieldFeedback
      :id="controlId"
      :hint="field.hint"
      :error="error"
      class="sm:col-start-2"
      :class="field.kind === 'textarea' ? '' : 'lg:col-start-auto lg:pt-1'"
    />
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { InputStackField } from '../lib/prototype-input-stack'
import PrototypeInputStackEnumInput from './PrototypeInputStackEnumInput.vue'
import PrototypeInputStackTextInput from './PrototypeInputStackTextInput.vue'
import FieldFeedback from './FieldFeedback.vue'

const props = defineProps<{
  stackId: string
  field: InputStackField
  modelValue: string
  error?: string
  disabled?: boolean
}>()

const controlId = computed(() => `${props.stackId}-${props.field.fieldId}`)
const describedBy = computed(() => {
  return `${controlId.value}-${props.error ? 'error' : 'hint'}`
})

defineEmits<{
  'update:modelValue': [value: string]
  commit: [trigger: 'blur' | 'enter']
}>()
</script>
