<template>
  <textarea
    v-if="field.kind === 'textarea'"
    :id="id"
    :value="draft"
    :required="field.required"
    :disabled="disabled"
    :placeholder="field.placeholder"
    :aria-describedby="describedBy"
    :aria-invalid="Boolean(error)"
    :data-track-field-id="field.fieldId"
    data-track-form-id="service-request"
    data-study-control
    autocomplete="off"
    rows="4"
    class="w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:bg-slate-100"
    @input="handleInput"
    @blur="$emit('commit', 'blur')"
    @compositionstart="isComposing = true"
    @compositionend="handleCompositionEnd"
  />
  <input
    v-else
    :id="id"
    :value="draft"
    :type="field.kind === 'date' ? 'text' : field.kind"
    :required="field.required"
    :disabled="disabled"
    :placeholder="field.placeholder"
    :inputmode="field.inputmode"
    :aria-describedby="describedBy"
    :aria-invalid="Boolean(error)"
    :data-track-field-id="field.fieldId"
    data-track-form-id="service-request"
    data-study-control
    autocomplete="off"
    enterkeyhint="next"
    class="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:bg-slate-100"
    @input="handleInput"
    @blur="$emit('commit', 'blur')"
    @keydown="handleKeydown"
    @compositionstart="isComposing = true"
    @compositionend="handleCompositionEnd"
  />
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import type { InputStackField } from '../lib/prototype-input-stack'

const props = defineProps<{
  id: string
  field: InputStackField
  modelValue: string
  describedBy: string
  error?: string
  disabled?: boolean
}>()

const isComposing = ref(false)
const draft = ref(props.modelValue)
const emit = defineEmits<{
  'update:modelValue': [value: string]
  commit: [trigger: 'blur' | 'enter']
}>()

function emitInputValue(event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    draft.value = target.value
    emit('update:modelValue', target.value)
  }
}

function handleInput(event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    draft.value = target.value
  }
  if (!isComposing.value) {
    emitInputValue(event)
  }
}

function handleCompositionEnd(event: CompositionEvent) {
  isComposing.value = false
  emitInputValue(event)
}

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Enter' || isComposing.value || event.isComposing || event.keyCode === 229) {
    return
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return
  }

  event.preventDefault()
  emit('commit', 'enter')
}

watch(
  () => props.modelValue,
  (value) => {
    if (!isComposing.value) {
      draft.value = value
    }
  },
)
</script>
