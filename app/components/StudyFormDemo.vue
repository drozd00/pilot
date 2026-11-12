<template>
  <div class="mx-auto max-w-4xl space-y-6">
    <header class="space-y-2">
      <NuxtLink to="/test" class="text-sm text-slate-600 underline"
        >Zpět na náhled formulářů</NuxtLink
      >
      <h1 class="flex items-center gap-3 text-2xl font-semibold text-slate-900">
        Náhled formuláře <InterfaceIndicator :variant="variant" />
      </h1>
      <p class="text-sm leading-6 text-slate-600">
        Náhled pro kontrolu ovládání. Údaje se neukládají a tento průchod není součástí studie.
      </p>
    </header>
    <section v-if="!started" class="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
      <h2 class="text-lg font-semibold">Před zahájením běhu</h2>
      <RunInstructions :variant="variant" />
      <button
        type="button"
        class="min-h-11 rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        @click="started = true"
      >
        Zahájit běh
      </button>
    </section>
    <StudyForm
      v-else
      :variant="variant"
      :model-value="values"
      :errors="errors"
      :disabled="isComplete"
      @update:model-value="updateValues"
      @commit="commitField"
      @submit="submitForm"
    />
    <div
      v-if="isComplete"
      class="space-y-3 rounded-md border border-emerald-300 bg-emerald-50 p-4"
      role="status"
    >
      <p>Formulář je správně vyplněný. Jde pouze o náhled; data nebyla uložena.</p>
      <button
        type="button"
        class="rounded-md border border-emerald-700 px-4 py-2 text-sm"
        @click="resetForm"
      >
        Vyplnit znovu
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  createEmptyServiceRequest,
  normalizeFieldValue,
  normalizeServiceRequest,
  validateServiceRequest,
} from '~/lib/service-request'
import type { FieldId, ServiceRequest } from '~/lib/service-request'
import type { FieldCommit } from '../lib/prototype-input-stack'
import StudyForm from './StudyForm.vue'

defineProps<{ variant: 'A' | 'B' }>()

const values = ref(createEmptyServiceRequest())
const errors = ref<Partial<Record<FieldId, string>>>({})
const isComplete = ref(false)
const started = ref(false)

function updateValues(nextValues: ServiceRequest) {
  values.value = nextValues
}

function commitField(commit: FieldCommit) {
  const fieldId = commit.fieldId
  values.value[fieldId] = normalizeFieldValue(fieldId, values.value[fieldId])
  const issues = validateServiceRequest(values.value)
  const issue = issues.find((candidate) => candidate.fieldId === fieldId)
  const nextErrors = { ...errors.value }
  if (issue) {
    nextErrors[fieldId] = issue.message
  } else {
    nextErrors[fieldId] = undefined
  }
  errors.value = nextErrors
}

function submitForm() {
  values.value = normalizeServiceRequest(values.value)
  const issues = validateServiceRequest(values.value)
  const nextErrors: Partial<Record<FieldId, string>> = {}
  for (const issue of issues) {
    nextErrors[issue.fieldId] = issue.message
  }
  errors.value = nextErrors
  isComplete.value = issues.length === 0
}

function resetForm() {
  started.value = false
  values.value = createEmptyServiceRequest()
  errors.value = {}
  isComplete.value = false
}
</script>
