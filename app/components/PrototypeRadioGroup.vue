<template>
  <div
    class="space-y-1.5"
    :data-track-field-id="trackFieldId"
    :data-track-form-id="trackFormId"
    @focusout="handleFocusOut"
  >
    <div :id="`${id}-label`" class="text-sm font-medium text-slate-700">
      {{ label }}
    </div>

    <RadioGroupRoot
      v-model="model"
      :name="trackFieldId ?? id"
      :disabled="disabled"
      :required="required"
      :aria-labelledby="`${id}-label`"
      :aria-describedby="`${id}-${error ? 'error' : 'hint'}`"
      class="grid gap-2 lg:grid-cols-3"
    >
      <div
        v-for="option in options"
        :key="option.value"
        :class="[
          'rounded-md border p-3',
          model === option.value ? 'border-slate-900 bg-slate-50' : 'border-slate-200 bg-white',
        ]"
      >
        <div class="flex items-start gap-3">
          <RadioGroupItem
            :id="`${id}-${option.value}`"
            :value="option.value"
            :data-track-field-id="trackFieldId"
            :data-track-form-id="trackFormId"
            :aria-invalid="Boolean(error)"
            :aria-describedby="`${id}-${error ? 'error' : 'hint'}`"
            data-study-control
            class="mt-0.5 grid h-4.5 w-4.5 place-items-center rounded-full border border-slate-400 bg-white outline-none focus-visible:ring-1 focus-visible:ring-slate-300"
          >
            <RadioGroupIndicator class="h-2 w-2 rounded-full bg-slate-900" />
          </RadioGroupItem>

          <div class="space-y-1">
            <Label :for="`${id}-${option.value}`" class="block text-sm font-medium text-slate-900">
              {{ option.label }}
            </Label>

            <p v-if="option.description" class="text-sm leading-6 text-slate-500">
              {{ option.description }}
            </p>
          </div>
        </div>
      </div>
    </RadioGroupRoot>

    <FieldFeedback :id="id" :hint="helper" :error="error" />
  </div>
</template>
<script setup lang="ts">
import { Label, RadioGroupIndicator, RadioGroupItem, RadioGroupRoot } from 'reka-ui'
import { computed } from 'vue'
import FieldFeedback from './FieldFeedback.vue'

type RadioOption = {
  value: string
  label: string
  description?: string
}

const props = withDefaults(
  defineProps<{
    id: string
    label: string
    modelValue?: string
    helper?: string
    options: readonly RadioOption[]
    trackFieldId?: string
    trackFormId?: string
    error?: string
    disabled?: boolean
    required?: boolean
  }>(),
  {
    modelValue: '',
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

function handleFocusOut(event: FocusEvent) {
  const current = event.currentTarget
  const next = event.relatedTarget
  if (current instanceof Element && next instanceof Node && current.contains(next)) {
    return
  }
  emit('commit')
}
</script>

<style scoped>
/* Reka's backing value input is for form events; the radio buttons expose the UI. */
:deep(input[data-hidden]) {
  display: none;
}
</style>
