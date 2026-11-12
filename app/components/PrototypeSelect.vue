<template>
  <div
    class="space-y-1.5"
    :data-track-field-id="trackFieldId"
    :data-track-form-id="trackFormId"
    @focusout="handleFocusOut"
  >
    <Label :for="id" class="block text-sm font-medium text-slate-700">
      {{ label }}
    </Label>

    <SelectRoot
      v-model="model"
      v-model:open="open"
      :name="trackFieldId ?? id"
      :disabled="disabled"
      :required="required"
    >
      <SelectTrigger
        :id="id"
        :data-track-field-id="trackFieldId"
        :data-track-form-id="trackFormId"
        :aria-invalid="Boolean(error)"
        :aria-describedby="`${id}-${error ? 'error' : 'hint'}`"
        data-study-control
        class="flex min-h-11 w-full items-center justify-between gap-3 rounded-md border border-slate-300 bg-white px-3 py-2.5 text-left text-sm text-slate-900 outline-none focus-visible:border-slate-400 focus-visible:ring-1 focus-visible:ring-slate-300"
      >
        <SelectValue :placeholder="placeholder" />
        <SelectIcon class="text-xs text-slate-500">▾</SelectIcon>
      </SelectTrigger>

      <SelectPortal>
        <SelectContent
          :aria-label="label"
          :data-track-field-id="trackFieldId"
          :data-track-form-id="trackFormId"
          class="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm"
          position="popper"
          :side-offset="6"
          @focusout="handleFocusOut"
          @keydown.capture="handleKeydown"
          @close-auto-focus="handleCloseAutoFocus"
        >
          <SelectViewport class="p-1">
            <SelectItem
              v-for="option in options"
              :key="option.value"
              :value="option.value"
              :data-track-field-id="trackFieldId"
              :data-track-form-id="trackFormId"
              class="flex cursor-pointer items-center justify-between gap-3 rounded-sm px-3 py-2 text-sm text-slate-900 outline-none data-highlighted:bg-slate-100 data-[state=checked]:bg-slate-100"
            >
              <SelectItemText>{{ option.label }}</SelectItemText>
              <SelectItemIndicator class="text-xs text-slate-600">●</SelectItemIndicator>
            </SelectItem>
          </SelectViewport>
        </SelectContent>
      </SelectPortal>
    </SelectRoot>

    <FieldFeedback :id="id" :hint="helper" :error="error" />
  </div>
</template>
<script setup lang="ts">
import {
  Label,
  SelectContent,
  SelectIcon,
  SelectItem,
  SelectItemIndicator,
  SelectItemText,
  SelectPortal,
  SelectRoot,
  SelectTrigger,
  SelectValue,
  SelectViewport,
} from 'reka-ui'
import { computed, ref } from 'vue'
import FieldFeedback from './FieldFeedback.vue'

type SelectOption = {
  value: string
  label: string
}

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: string
    placeholder?: string
    helper?: string
    trackFieldId?: string
    trackFormId?: string
    options: readonly SelectOption[]
    error?: string
    disabled?: boolean
    required?: boolean
  }>(),
  {
    modelValue: '',
    placeholder: 'Vyberte možnost',
    helper: undefined,
    trackFieldId: undefined,
    trackFormId: undefined,
    error: undefined,
  },
)

const emit = defineEmits<{
  'update:modelValue': [value: string]
  commit: []
}>()

const model = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value ? String(value) : ''),
})

const open = ref(false)
let tabbingAway = false

function handleKeydown(event: KeyboardEvent) {
  if (event.key !== 'Tab' || event.altKey || event.ctrlKey || event.metaKey) {
    return
  }

  const trigger = document.getElementById(props.id)
  if (!trigger) {
    return
  }

  // Let native Tab navigation continue from the trigger instead of the portal.
  event.stopPropagation()
  tabbingAway = true
  open.value = false
  trigger.focus({ preventScroll: true })
}

function handleCloseAutoFocus(event: Event) {
  if (tabbingAway) {
    event.preventDefault()
    tabbingAway = false
  }
}

function handleFocusOut(event: FocusEvent) {
  const next = event.relatedTarget
  if (next instanceof Element) {
    const nextField = next.closest('[data-track-field-id]')
    if (nextField?.getAttribute('data-track-field-id') === props.trackFieldId) {
      return
    }
  }
  emit('commit')
}
</script>
