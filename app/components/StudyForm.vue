<template>
  <form
    ref="formElement"
    data-track-form-id="service-request"
    novalidate
    class="space-y-6"
    @submit.prevent="handleSubmit"
  >
    <p class="text-sm leading-6 text-slate-600">
      Všechna pole jsou povinná.
      <template v-if="variant === 'B'"
        >Enter potvrdí pole a přesune vás dál. V nabídce použijte šipky; Escape ji zavře.</template
      >
    </p>
    <p
      role="alert"
      class="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800"
      :class="{ invisible: errorCount === 0 }"
    >
      Zkontrolujte označená pole ({{ errorCount }}). Údaje zůstaly zachovány.
    </p>

    <template v-for="section in sections" :key="section.id">
      <PrototypeInputStack
        v-if="variant === 'B'"
        :id="`advanced-${section.id}`"
        :label="section.label"
        :fields="section.fields"
        :model-value="modelValue"
        :errors="errors"
        :disabled="disabled"
        @update-field="updateField($event.fieldId, $event.value)"
        @commit="handleCommit"
      />
      <fieldset
        v-else
        :disabled="disabled"
        class="min-w-0 rounded-lg border border-slate-300 bg-white p-5"
      >
        <legend class="px-2 text-base font-semibold text-slate-900">{{ section.label }}</legend>
        <div class="grid gap-5 sm:grid-cols-2">
          <div
            v-for="field in section.fields"
            :key="field.fieldId"
            :class="
              field.kind === 'textarea' || field.kind === 'radio' || field.fieldId === 'fullName'
                ? 'sm:col-span-2'
                : ''
            "
            class="min-w-0 space-y-1.5"
          >
            <PrototypeSelect
              v-if="field.kind === 'select' && field.options"
              :id="`standard-${field.fieldId}`"
              :model-value="modelValue[field.fieldId]"
              :label="field.label"
              :options="field.options"
              :helper="field.hint"
              :error="errors[field.fieldId]"
              :disabled="disabled"
              :required="field.required"
              :track-field-id="field.fieldId"
              track-form-id="service-request"
              @update:model-value="updateField(field.fieldId, $event)"
              @commit="handleCommit({ fieldId: field.fieldId, trigger: 'blur' })"
            />
            <PrototypeRadioGroup
              v-else-if="field.kind === 'radio' && field.options"
              :id="`standard-${field.fieldId}`"
              :model-value="modelValue[field.fieldId]"
              :label="field.label"
              :options="field.options"
              :helper="field.hint"
              :error="errors[field.fieldId]"
              :disabled="disabled"
              :required="field.required"
              :track-field-id="field.fieldId"
              track-form-id="service-request"
              @update:model-value="updateField(field.fieldId, $event)"
              @commit="handleCommit({ fieldId: field.fieldId, trigger: 'blur' })"
            />
            <template v-else>
              <label
                :for="`standard-${field.fieldId}`"
                class="block text-sm font-medium text-slate-800"
                >{{ field.label }}</label
              >
              <textarea
                v-if="field.kind === 'textarea'"
                :id="`standard-${field.fieldId}`"
                :name="field.fieldId"
                :value="modelValue[field.fieldId]"
                :required="field.required"
                :disabled="disabled"
                :aria-invalid="Boolean(errors[field.fieldId])"
                :aria-describedby="getStandardDescription(field.fieldId)"
                :data-track-field-id="field.fieldId"
                data-track-form-id="service-request"
                autocomplete="off"
                rows="4"
                :class="controlClass"
                @input="updateFromEvent(field.fieldId, $event)"
                @blur="handleCommit({ fieldId: field.fieldId, trigger: 'blur' })"
              />
              <input
                v-else
                :id="`standard-${field.fieldId}`"
                :name="field.fieldId"
                :value="modelValue[field.fieldId]"
                :type="field.kind"
                :placeholder="field.placeholder"
                :required="field.required"
                :disabled="disabled"
                :inputmode="field.inputmode"
                :aria-invalid="Boolean(errors[field.fieldId])"
                :aria-describedby="getStandardDescription(field.fieldId)"
                :data-track-field-id="field.fieldId"
                data-track-form-id="service-request"
                :autocomplete="getStandardAutocomplete(field.fieldId)"
                :class="controlClass"
                @input="updateFromEvent(field.fieldId, $event)"
                @blur="handleCommit({ fieldId: field.fieldId, trigger: 'blur' })"
              />
              <FieldFeedback
                :id="`standard-${field.fieldId}`"
                :hint="
                  field.fieldId === 'preferredDate' ? 'Zadejte datum včetně roku.' : field.hint
                "
                :error="errors[field.fieldId]"
              />
            </template>
          </div>
        </div>
      </fieldset>
    </template>

    <div class="flex justify-end border-t border-slate-200 pt-5">
      <button
        type="submit"
        data-study-control
        :disabled="disabled"
        class="min-h-11 rounded-md bg-slate-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-slate-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:cursor-not-allowed disabled:bg-slate-400"
      >
        Odeslat formulář
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import { FIELD_DEFINITIONS } from '~/lib/service-request'
import type { FieldId, ServiceRequest } from '~/lib/service-request'
import type { FieldCommit, InputStackField } from '../lib/prototype-input-stack'
import PrototypeInputStack from './PrototypeInputStack.vue'
import PrototypeSelect from './PrototypeSelect.vue'
import PrototypeRadioGroup from './PrototypeRadioGroup.vue'
import FieldFeedback from './FieldFeedback.vue'

const props = defineProps<{
  variant: 'A' | 'B'
  modelValue: ServiceRequest
  errors: Partial<Record<FieldId, string>>
  disabled?: boolean
}>()

const formElement = ref<HTMLFormElement | null>(null)
let advancingField: FieldId | null = null
const controlClass =
  'min-h-11 w-full rounded-md border border-slate-300 bg-white px-3 py-2 text-sm leading-6 text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-600 disabled:bg-slate-100'
const hints: Record<FieldId, string> = {
  fullName: 'Jméno a příjmení kontaktní osoby podle zadání.',
  phone: '9 číslic; lze použít předvolbu +420 nebo 00420.',
  email: 'E-mailová adresa kontaktní osoby.',
  street: 'Název ulice bez čísla domu.',
  houseNumber: 'Číslo popisné / orientační, např. 2317/12.',
  zipCode: '5 číslic, s mezerou nebo bez ní.',
  city: 'Obec nebo městská část.',
  objectType: 'Vyberte typ objektu podle zadání.',
  issueCategory: 'Vyberte kategorii problému podle zadání.',
  priority: 'Vyberte prioritu podle zadání.',
  preferredDate: 'Datum včetně roku. U textového vstupu např. 15. 4. 2026 nebo 2026-04-15.',
  timeWindow: 'Vyberte časové okno podle zadání.',
}
const placeholders: Partial<Record<FieldId, string>> = {
  fullName: 'Jan Urban',
  phone: '+420 777 123 456',
  email: 'jan.urban@example.test',
  street: 'U Lesa',
  houseNumber: '81/25',
  zipCode: '120 00',
  city: 'Praha 2',
  preferredDate: '15. 4. 2026',
}
const sectionDefinitions: { id: string; label: string; fieldIds: FieldId[] }[] = [
  { id: 'contact', label: 'Kontakt', fieldIds: ['fullName', 'phone', 'email'] },
  { id: 'address', label: 'Adresa', fieldIds: ['street', 'houseNumber', 'zipCode', 'city'] },
  { id: 'service', label: 'Služba', fieldIds: ['objectType', 'issueCategory', 'priority'] },
  { id: 'schedule', label: 'Termín', fieldIds: ['preferredDate', 'timeWindow'] },
]
const sections = sectionDefinitions.map((section) => {
  const fields: InputStackField[] = []
  for (const fieldId of section.fieldIds) {
    const definition = FIELD_DEFINITIONS.find((field) => field.fieldId === fieldId)
    if (definition) {
      fields.push({
        ...definition,
        hint: hints[fieldId],
        placeholder: placeholders[fieldId] ?? 'Napište nebo vyberte možnost',
        inputmode: fieldId === 'phone' ? 'tel' : fieldId === 'zipCode' ? 'numeric' : undefined,
      })
    }
  }
  return { id: section.id, label: section.label, fields }
})
const errorCount = computed(() => Object.keys(props.errors).length)

const emit = defineEmits<{
  'update:modelValue': [value: ServiceRequest]
  commit: [commit: FieldCommit]
  submit: []
}>()

function updateField(fieldId: FieldId, value: string) {
  if (!props.disabled) {
    emit('update:modelValue', { ...props.modelValue, [fieldId]: value })
  }
}

function updateFromEvent(fieldId: FieldId, event: Event) {
  const target = event.target
  if (target instanceof HTMLInputElement || target instanceof HTMLTextAreaElement) {
    updateField(fieldId, target.value)
  }
}

function getStandardDescription(fieldId: FieldId) {
  return `standard-${fieldId}-${props.errors[fieldId] ? 'error' : 'hint'}`
}

function getStandardAutocomplete(fieldId: FieldId) {
  const autocompleteFields: Partial<Record<FieldId, string>> = {
    fullName: 'name',
    phone: 'tel',
    email: 'email',
    street: 'address-line1',
    zipCode: 'postal-code',
    city: 'address-level2',
  }
  return autocompleteFields[fieldId] ?? 'off'
}

async function handleCommit(commit: FieldCommit) {
  if (props.disabled || (commit.trigger === 'blur' && advancingField === commit.fieldId)) {
    return
  }

  emit('commit', commit)
  if (commit.trigger !== 'enter') {
    return
  }

  await nextTick()
  if (props.errors[commit.fieldId] || !formElement.value || props.disabled) {
    return
  }

  const controls = formElement.value.querySelectorAll<HTMLElement>(
    '[data-study-control]:not([disabled])',
  )
  const orderedControls = Array.from(controls)
  const currentIndex = orderedControls.findIndex((control) => {
    return control.getAttribute('data-track-field-id') === commit.fieldId
  })
  const nextControl = controls[currentIndex + 1]
  if (currentIndex >= 0 && nextControl) {
    advancingField = commit.fieldId
    nextControl.focus()
    advancingField = null
  }
}

function handleSubmit() {
  if (!props.disabled) {
    emit('submit')
  }
}
</script>
