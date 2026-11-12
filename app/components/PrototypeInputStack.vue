<template>
  <fieldset class="min-w-0 rounded-lg border border-slate-300 bg-white" :disabled="disabled">
    <legend class="ml-4 px-2 text-base font-semibold text-slate-900">{{ label }}</legend>
    <PrototypeInputStackFieldRow
      v-for="field in fields"
      :key="field.fieldId"
      :stack-id="id"
      :field="field"
      :model-value="modelValue[field.fieldId]"
      :error="errors[field.fieldId]"
      :disabled="disabled"
      @update:model-value="$emit('update-field', { fieldId: field.fieldId, value: $event })"
      @commit="$emit('commit', { fieldId: field.fieldId, trigger: $event })"
    />
  </fieldset>
</template>

<script setup lang="ts">
import type { FieldId, ServiceRequest } from '~/lib/service-request'
import type { FieldCommit, InputStackField } from '../lib/prototype-input-stack'
import PrototypeInputStackFieldRow from './PrototypeInputStackFieldRow.vue'

defineProps<{
  id: string
  label: string
  fields: InputStackField[]
  modelValue: ServiceRequest
  errors: Partial<Record<FieldId, string>>
  disabled?: boolean
}>()

defineEmits<{
  'update-field': [change: { fieldId: FieldId; value: string }]
  commit: [commit: FieldCommit]
}>()
</script>
