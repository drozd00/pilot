<script setup lang="ts">
import { FIELD_DEFINITIONS, type FieldDefinition } from '~/lib/service-request'
import {
  ESTIMATED_SESSION_MINUTES,
  MEASURED_RUNS_PER_VARIANT,
  PAUSE_BETWEEN_BLOCKS_MS,
  RUNS_PER_VARIANT,
  type SessionResponse,
  type Trial,
} from '~/lib/study'

const study = ref<SessionResponse | null>(null)
const currentTrial = ref<Trial | null>(null)
const consent = ref(false)
const busy = ref(true)
const problem = ref('')
const withdrawn = ref(false)
const pauseSeconds = ref(0)
const {
  values,
  errors,
  active,
  preparing,
  saving,
  saved,
  message,
  storageFailed,
  startTrial,
  commitField,
  submitTrial,
  abortTrial,
  retryUpload,
  recoverQueue,
} = useTrial()
let pauseTimer: ReturnType<typeof setInterval> | undefined
let releaseTab: (() => void) | undefined
const showTask = computed(() => preparing.value || active.value || saving.value || saved.value)
const isFinished = computed(() => study.value !== null && !currentTrial.value)

function formatScenarioValue(field: FieldDefinition) {
  const value = currentTrial.value?.scenario.values[field.fieldId] ?? ''
  if (field.options) {
    const option = field.options.find((item) => item.value === value)
    return option?.label ?? value
  }
  if (field.fieldId === 'preferredDate') {
    const [year, month, day] = value.split('-')
    return `${day}. ${month}. ${year}`
  }
  return value
}

async function runAction(action: () => Promise<void>) {
  busy.value = true
  problem.value = ''
  try {
    await action()
  } catch (error) {
    problem.value = error instanceof Error ? error.message : 'Operaci se nepodařilo dokončit.'
  } finally {
    busy.value = false
  }
}

function selectNextTrial() {
  currentTrial.value = study.value?.trials.find((trial) => trial.status === 'ready') ?? null
  saved.value = false
  clearInterval(pauseTimer)
  pauseSeconds.value = 0
  if (currentTrial.value?.ordinal !== RUNS_PER_VARIANT + 1) return
  const previous = study.value?.trials.find((trial) => trial.ordinal === RUNS_PER_VARIANT)
  const ended = previous?.ended_at ? Date.parse(previous.ended_at) : Date.now()
  function updatePause() {
    pauseSeconds.value = Math.max(
      0,
      Math.ceil((ended + PAUSE_BETWEEN_BLOCKS_MS - Date.now()) / 1000),
    )
    if (!pauseSeconds.value) clearInterval(pauseTimer)
  }
  updatePause()
  if (pauseSeconds.value) pauseTimer = setInterval(updatePause, 1000)
}

async function loadStudy() {
  study.value = await $fetch<SessionResponse>('/api/sessions/current')
  selectNextTrial()
}

async function recoverStudy() {
  const resumeId = localStorage.getItem('active-study-session')
  if (resumeId) {
    try {
      await $fetch('/api/sessions/resume', { method: 'POST', body: { sessionId: resumeId } })
    } catch (error) {
      if ((error as { statusCode?: number }).statusCode !== 404) throw error
      // Flush pending events before clearing an unavailable session.
      await recoverQueue()
      await $fetch('/api/sessions/close', { method: 'POST' })
      localStorage.removeItem('active-study-session')
      localStorage.removeItem('pending-study-session')
      study.value = null
      currentTrial.value = null
      consent.value = false
      saved.value = false
      return
    }
  }
  await recoverQueue()
  try {
    study.value = await $fetch<SessionResponse>('/api/sessions/current')
  } catch (error) {
    if ((error as { statusCode?: number }).statusCode === 404) return
    throw error
  }
  // Reloading resets performance.now(), so mark the running trial as interrupted.
  for (const trial of study.value.trials) {
    if (trial.status !== 'running') continue
    await $fetch(`/api/trials/${trial.id}/abort`, { method: 'POST', body: { reason: 'reload' } })
    problem.value = 'Obnovení stránky přerušilo předchozí běh. Pokračujte dalším během.'
  }
  await loadStudy()
}

async function beginStudy() {
  if (!consent.value) return
  await runAction(async () => {
    await recoverQueue()
    let sessionId = localStorage.getItem('pending-study-session')
    if (!sessionId) {
      sessionId = crypto.randomUUID()
      localStorage.setItem('pending-study-session', sessionId)
    }
    study.value = await $fetch<SessionResponse>('/api/sessions', {
      method: 'POST',
      body: { sessionId },
    })
    localStorage.setItem('active-study-session', sessionId)
    localStorage.removeItem('pending-study-session')
    selectNextTrial()
  })
}

async function beginTrial() {
  if (!currentTrial.value || pauseSeconds.value) return
  await runAction(async () => {
    const session = await startTrial(currentTrial.value!)
    if (study.value) study.value.session = session
  })
}

async function withdrawStudy() {
  await runAction(async () => {
    if (active.value) await abortTrial('withdrawal')
    await recoverQueue()
    await $fetch('/api/sessions/withdraw', { method: 'POST' })
    withdrawn.value = true
    await loadStudy()
  })
}

async function prepareNewParticipant() {
  await runAction(async () => {
    await recoverQueue()
    await $fetch('/api/sessions/close', { method: 'POST' })
    localStorage.removeItem('active-study-session')
    localStorage.removeItem('pending-study-session')
    clearInterval(pauseTimer)
    study.value = null
    currentTrial.value = null
    withdrawn.value = false
    consent.value = false
    saved.value = false
  })
}

onMounted(async () => {
  if (!navigator.locks) {
    problem.value = 'Použijte podporovaný prohlížeč Chromium na počítači moderátora.'
    return
  }
  void navigator.locks.request('thesis-study', { ifAvailable: true }, async (lock) => {
    if (!lock) {
      problem.value =
        'Studie je už otevřená v jiné kartě. Zavřete tuto kartu a pokračujte v původní.'
      return
    }
    await runAction(recoverStudy)
    await new Promise<void>((resolve) => {
      releaseTab = resolve
    })
  })
})
onBeforeUnmount(() => {
  clearInterval(pauseTimer)
  releaseTab?.()
})

function reloadInterruptedTrial() {
  window.location.reload()
}
</script>

<template>
  <div class="space-y-5">
    <header class="flex flex-wrap items-start justify-between gap-4">
      <div>
        <p class="text-xs text-slate-500">Bakalářská studie · Jakub Drozd</p>
        <h1 class="mt-1 text-2xl font-semibold">Vyplňování servisního požadavku</h1>
        <p v-if="study" class="mt-1 text-sm text-slate-600">
          Účastník {{ study.session.participant_code }} ·
          {{ study.session.dataset_kind === 'preflight' ? 'Technická zkouška' : 'Pilotní měření' }}
        </p>
      </div>
      <button
        v-if="study && !isFinished"
        type="button"
        class="secondary-button"
        :disabled="busy || saving"
        @click="withdrawStudy"
      >
        Ukončit účast
      </button>
    </header>
    <div
      v-if="problem"
      role="alert"
      class="rounded-lg border border-rose-300 bg-rose-50 p-4 text-sm text-rose-900"
    >
      {{ problem }}
      <button
        v-if="!busy && !active && !saving"
        type="button"
        class="ml-3 underline"
        @click="runAction(recoverStudy)"
      >
        Zkusit obnovit spojení
      </button>
    </div>
    <div
      v-if="message"
      role="status"
      class="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950"
    >
      {{ message }}
      <button v-if="!storageFailed" type="button" class="ml-3 underline" @click="retryUpload">
        Zkusit přenos znovu
      </button>
      <template v-else>
        <p class="mt-2">
          Požádejte moderátora o pomoc. Tento běh nebude použit jako dokončené měření. Obnovení
          stránky zachová již uloženou část záznamu a přeruší běh.
        </p>
        <button type="button" class="mt-2 underline" @click="reloadInterruptedTrial">
          Obnovit stránku a přerušit běh
        </button>
      </template>
    </div>
    <section
      v-if="!study"
      class="mx-auto max-w-3xl space-y-5 rounded-xl border border-slate-200 bg-white p-6"
    >
      <h2 class="text-xl font-semibold">Informace před zahájením</h2>
      <p>
        Vyplníte dva formuláře se stejnými otázkami. U každého vás čeká jeden seznamovací a dva
        měřené běhy, celkem šest běhů. Mezi formuláři je 30sekundová přestávka. Celá účast zabere
        odhadem {{ ESTIMATED_SESSION_MINUTES }} minut. V případě potřeby si můžete odpočinout nebo
        účast ukončit.
      </p>
      <p>
        Přepisujte pouze připravené fiktivní údaje bez diakritiky. Nepoužívejte schránku ani
        automatické vyplnění. Pracujte běžným tempem a přesně; během měřeného běhu bez pomoci
        moderátora.
      </p>
      <p>
        Zaznamenáváme čas a pořadí interakcí, délky vstupů, opravy, navigaci a pohyb ukazatele ve
        formuláři. Běžné napsané znaky ani obsah polí nejsou součástí událostí. Odpovědi se při
        odeslání ověří proti zadání. Neodeslané záznamy dočasně zůstávají v prohlížeči.
      </p>
      <p>
        Účast je dobrovolná; běh můžete přeskočit nebo účast ukončit. Záznam s náhodným
        identifikátorem a kódem účastníka slouží k souhrnnému vyhodnocení práce. S dotazy či žádostí
        o odstranění dat se obraťte na moderátora a uveďte svůj kód.
      </p>
      <label class="flex items-start gap-3 rounded-lg bg-slate-50 p-4">
        <input v-model="consent" type="checkbox" class="mt-1 size-4" :disabled="busy" />
        <span
          >Přečetl(a) jsem si informace a souhlasím s účastí a popsaným záznamem interakcí.</span
        >
      </label>
      <button type="button" class="primary-button" :disabled="busy || !consent" @click="beginStudy">
        {{ busy ? 'Připravuji spojení…' : 'Zahájit účast' }}
      </button>
    </section>
    <section
      v-else-if="isFinished"
      class="mx-auto max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
    >
      <h2 class="text-xl font-semibold">
        {{ withdrawn ? 'Účast byla ukončena' : 'Děkujeme za účast' }}
      </h2>
      <p>Potvrzené záznamy jsou uložené. Předejte prosím počítač moderátorovi.</p>
      <button
        type="button"
        class="secondary-button"
        :disabled="busy"
        @click="prepareNewParticipant"
      >
        Připravit dalšího účastníka
      </button>
    </section>
    <template v-else-if="currentTrial">
      <section
        v-if="!showTask"
        class="mx-auto max-w-3xl space-y-4 rounded-xl border border-slate-200 bg-white p-6"
      >
        <div class="flex items-center justify-between gap-3">
          <p class="text-sm text-slate-600">
            Běh {{ currentTrial.ordinal }} z {{ RUNS_PER_VARIANT * 2 }} ·
            {{
              currentTrial.phase === 'familiarization'
                ? 'Seznamovací běh'
                : `Měřený běh ${currentTrial.repetition} z ${MEASURED_RUNS_PER_VARIANT}`
            }}
          </p>
          <InterfaceIndicator :variant="currentTrial.variant" />
        </div>
        <h2 class="text-xl font-semibold">Před zahájením běhu</h2>
        <RunInstructions :variant="currentTrial.variant" />
        <p v-if="currentTrial.phase === 'familiarization'" class="text-sm text-slate-600">
          Seznamovací běh nepatří do hlavního vyhodnocení. Nyní se můžete moderátora zeptat na
          ovládání.
        </p>
        <p v-if="pauseSeconds" role="status">
          Přestávka mezi formuláři. Pokračovat lze za {{ pauseSeconds }} s.
        </p>
        <button
          type="button"
          class="primary-button"
          :disabled="busy || pauseSeconds > 0"
          @click="beginTrial"
        >
          Zahájit běh
        </button>
      </section>
      <div
        v-else
        :style="{ visibility: preparing ? 'hidden' : undefined }"
        :inert="preparing"
        class="grid items-start gap-5 lg:grid-cols-[19rem_minmax(0,1fr)]"
      >
        <aside
          class="rounded-xl border border-slate-200 bg-white p-5 lg:sticky lg:top-5"
          aria-label="Zadání běhu"
        >
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold text-slate-500">
              Běh {{ currentTrial.ordinal }} z {{ RUNS_PER_VARIANT * 2 }} ·
              {{ currentTrial.phase === 'familiarization' ? 'Seznamovací' : 'Měřený' }}
            </p>
            <InterfaceIndicator :variant="currentTrial.variant" />
          </div>
          <h2 class="mt-2 text-lg font-semibold">{{ currentTrial.scenario.label }}</h2>
          <p class="my-3 text-sm text-slate-600">Přepište následující fiktivní údaje.</p>
          <dl class="space-y-2.5">
            <div v-for="field in FIELD_DEFINITIONS" :key="field.fieldId">
              <dt class="text-xs text-slate-500">{{ field.label }}</dt>
              <dd class="break-words text-sm font-medium">{{ formatScenarioValue(field) }}</dd>
            </div>
          </dl>
        </aside>
        <section class="space-y-4" aria-label="Vyplnění požadavku">
          <StudyForm
            v-model="values"
            :variant="currentTrial.variant"
            :errors="errors"
            :disabled="!active || storageFailed"
            @commit="commitField"
            @submit="submitTrial"
          />
          <div
            v-if="saved"
            role="status"
            class="flex flex-wrap items-center gap-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4"
          >
            <p>Běh je uložený.</p>
            <button
              type="button"
              class="primary-button"
              :disabled="busy"
              @click="runAction(loadStudy)"
            >
              Pokračovat
            </button>
          </div>
          <p v-else-if="saving" role="status">
            Čekám na potvrzení uložení. Nezavírejte prosím stránku.
          </p>
          <button
            v-else
            type="button"
            class="secondary-button"
            :disabled="busy || storageFailed"
            @click="runAction(() => abortTrial())"
          >
            Přeskočit tento běh
          </button>
        </section>
      </div>
    </template>
  </div>
</template>

<style scoped>
.primary-button,
.secondary-button {
  min-height: 2.75rem;
  border-radius: 0.5rem;
  padding: 0.625rem 1rem;
  font-weight: 600;
  font-size: 0.875rem;
}
.primary-button {
  background: #0f172a;
  color: white;
}
.secondary-button {
  border: 1px solid #cbd5e1;
  background: white;
  color: #334155;
}
button:focus-visible {
  outline: 3px solid #2563eb;
  outline-offset: 3px;
}
button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}
</style>
