<template>
  <div class="relative min-w-0">
    <input
      :id="id"
      ref="inputElement"
      :value="draft"
      :required="field.required"
      :disabled="disabled"
      :placeholder="field.placeholder"
      :aria-describedby="describedBy"
      :aria-invalid="Boolean(error)"
      :aria-expanded="isOpen && !disabled"
      :aria-controls="panelId"
      :aria-activedescendant="activeOptionId"
      :data-track-field-id="field.fieldId"
      data-track-form-id="service-request"
      data-study-control
      role="combobox"
      aria-autocomplete="list"
      autocomplete="off"
      enterkeyhint="next"
      class="min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:bg-slate-100"
      @focus="handleFocus"
      @blur="handleBlur"
      @input="handleInput"
      @keydown="handleKeydown"
      @compositionstart="isComposing = true"
      @compositionend="handleCompositionEnd"
    />
    <PrototypeInputStackOptionPanel
      v-if="isOpen && !disabled"
      :id="panelId"
      :label="field.label"
      :field-id="field.fieldId"
      :options="visibleOptions"
      :highlighted-value="highlightedValue"
      @select="selectOption"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { FieldOption } from '~/lib/service-request'
import { findMatchingOptions, findNextOption } from '../lib/input-options'
import type { InputStackField } from '../lib/prototype-input-stack'
import PrototypeInputStackOptionPanel from './PrototypeInputStackOptionPanel.vue'

const props = defineProps<{
  id: string
  field: InputStackField
  modelValue: string
  describedBy: string
  error?: string
  disabled?: boolean
}>()

const draft = ref(getDisplayValue(props.modelValue))
const inputElement = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)
const isComposing = ref(false)
const highlightedValue = ref('')
let lastEmittedValue: string | undefined

const panelId = computed(() => `${props.id}-options`)
const visibleOptions = computed(() => findMatchingOptions(props.field.options ?? [], query.value))
const activeOptionId = computed(() => {
  if (!isOpen.value || props.disabled || !highlightedValue.value) {
    return undefined
  }
  return `${panelId.value}-${highlightedValue.value}`
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  commit: [trigger: 'blur' | 'enter']
}>()

function getDisplayValue(value: string) {
  const option = props.field.options?.find((candidate) => candidate.value === value)
  return option?.label ?? value
}

function emitValue(value: string) {
  lastEmittedValue = value
  emit('update:modelValue', value)
}

function handleFocus() {
  query.value = ''
  isOpen.value = true
  const selected = props.field.options?.find((option) => option.value === props.modelValue)
  highlightedValue.value = selected?.value ?? ''
}

function handleBlur() {
  isOpen.value = false
  highlightedValue.value = ''
  emit('commit', 'blur')
}

function updateDraft(target: HTMLInputElement) {
  draft.value = target.value
  query.value = target.value
  isOpen.value = true
  const matches = findMatchingOptions(props.field.options ?? [], target.value)
  highlightedValue.value = matches[0]?.value ?? ''
  emitValue(target.value)
}

function handleInput(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLInputElement)) {
    return
  }
  draft.value = target.value
  if (!isComposing.value) {
    updateDraft(target)
  }
}

function handleCompositionEnd(event: CompositionEvent) {
  isComposing.value = false
  const target = event.target
  if (target instanceof HTMLInputElement) {
    updateDraft(target)
  }
}

function selectOption(option: FieldOption) {
  const changed = props.modelValue !== option.value
  draft.value = option.label
  query.value = ''
  highlightedValue.value = option.value
  emitValue(option.value)
  isOpen.value = false
  if (changed && inputElement.value) {
    // Publish the committed selection as a bubbling change event.
    inputElement.value.value = option.label
    inputElement.value.dispatchEvent(new Event('change', { bubbles: true }))
  }
}

function handleKeydown(event: KeyboardEvent) {
  if (isComposing.value || event.isComposing || event.keyCode === 229) {
    return
  }
  if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) {
    return
  }

  if (event.key === 'Escape') {
    event.preventDefault()
    isOpen.value = false
    highlightedValue.value = ''
    return
  }

  if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
    event.preventDefault()
    isOpen.value = true
    const direction = event.key === 'ArrowDown' ? 1 : -1
    const nextOption = findNextOption(visibleOptions.value, highlightedValue.value, direction)
    highlightedValue.value = nextOption?.value ?? ''
    return
  }

  if (event.key !== 'Enter') {
    return
  }

  event.preventDefault()
  const highlightedOption = visibleOptions.value.find(
    (option) => option.value === highlightedValue.value,
  )
  if (isOpen.value && highlightedOption) {
    selectOption(highlightedOption)
  }
  isOpen.value = false
  emit('commit', 'enter')
}

watch(
  () => props.modelValue,
  (value) => {
    if (value !== lastEmittedValue) {
      draft.value = getDisplayValue(value)
    }
    lastEmittedValue = undefined
  },
)
</script>
