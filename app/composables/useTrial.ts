import { createInputTracker, type InputTracker, type InputTrackerEvent } from 'input-tracker'
import { EventQueue } from '../services/event-queue'
import {
  createEmptyServiceRequest,
  FIELD_DEFINITIONS,
  validateServiceRequest,
  normalizeServiceRequest,
  type FieldId,
} from '~/lib/service-request'
import type { StudySession, Trial } from '~/lib/study'

export function useTrial() {
  const values = ref(createEmptyServiceRequest())
  const errors = ref<Partial<Record<FieldId, string>>>({})
  const active = ref(false)
  const preparing = ref(false)
  const saving = ref(false)
  const saved = ref(false)
  const message = ref('')
  const storageFailed = ref(false)
  let tracker: InputTracker | null = null
  let trial: Trial | null = null
  let queue: EventQueue | null = null
  let timer: ReturnType<typeof setInterval> | null = null
  let finalWrite: Promise<void> | null = null

  function getQueue() {
    if (!queue) queue = new EventQueue()
    return queue
  }

  function resolveAttribute(target: EventTarget | null, name: string) {
    if (!(target instanceof Element)) return undefined
    return target.closest(`[${name}]`)?.getAttribute(name) ?? undefined
  }

  function recordEvent(event: InputTrackerEvent) {
    if (!trial || event.type === 'trial.completed' || event.type === 'trial.aborted') return
    void getQueue()
      .append(trial.id, event)
      .catch((error) => {
        storageFailed.value = true
        message.value = error.message
        stopTracking()
      })
    // Pending events are persisted in EventQueue; release the in-memory copies.
    tracker?.flush()
  }

  async function retryUpload() {
    const completing = saving.value
    try {
      if (completing && finalWrite) await finalWrite
      await getQueue().flush()
      if (!storageFailed.value) message.value = ''
      if (completing) {
        saving.value = false
        saved.value = true
      }
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Přenos dat se nezdařil.'
    }
  }

  async function recoverQueue() {
    await getQueue().flush()
  }

  async function startTrial(nextTrial: Trial) {
    await recoverQueue()
    trial = nextTrial
    values.value = createEmptyServiceRequest()
    errors.value = {}
    message.value = ''
    saved.value = false
    storageFailed.value = false
    finalWrite = null
    tracker = createInputTracker({
      sessionId: trial.session_id,
      trackRegisteredFormsOnly: true,
      trackPointerTrajectory: true,
      pointerSamplingHz: 8,
      resolveFieldId: (target) => resolveAttribute(target, 'data-track-field-id'),
      resolveFormId: (target) => resolveAttribute(target, 'data-track-form-id'),
      onEvent: recordEvent,
    })
    const trackedFields = []
    for (const [index, field] of FIELD_DEFINITIONS.entries()) {
      trackedFields.push({
        fieldId: field.fieldId,
        order: index + 1,
        fieldKind: field.kind,
        shortcuts: { enterIsCommand: field.kind !== 'textarea' },
      })
    }
    tracker.registerForm({ formId: 'service-request', fields: trackedFields })
    const pageId = tracker.exportData().pageId
    const response = await $fetch<{ started: true; session: StudySession }>(
      `/api/trials/${trial.id}/start`,
      { method: 'POST', body: { pageId } },
    )
    preparing.value = true
    await nextTick()
    // Wait for the disabled form to render before recording trial.started.
    await new Promise<void>((resolve) => requestAnimationFrame(() => resolve()))
    tracker.emitAppEvent({ formId: 'service-request', type: 'trial.started', payload: {} })
    tracker.start()
    preparing.value = false
    active.value = true
    timer = setInterval(() => {
      void retryUpload()
    }, 1000)
    return response.session
  }

  function validateField(fieldId: FieldId, trigger: 'blur' | 'enter' | 'submit') {
    if (!trial || !tracker || !active.value) return
    const issues = validateServiceRequest(values.value, trial.scenario.values)
    const issue = issues.find((item) => item.fieldId === fieldId)
    if (issue) errors.value[fieldId] = issue.message
    else errors.value[fieldId] = undefined
    tracker.emitAppEvent({
      formId: 'service-request',
      fieldId,
      type: 'validation.result',
      payload: { trigger, valid: !issue, ruleIds: issue ? [issue.ruleId] : [] },
    })
  }

  function commitField(input: { fieldId: FieldId; trigger: 'blur' | 'enter' }) {
    validateField(input.fieldId, input.trigger)
  }

  function stopTracking() {
    tracker?.stop()
    if (timer) clearInterval(timer)
    timer = null
  }

  async function submitTrial() {
    if (!trial || !tracker || !active.value || storageFailed.value) return
    const attemptId = crypto.randomUUID()
    const submission = tracker.emitAppEvent({
      formId: 'service-request',
      type: 'submit.attempted',
      payload: { attemptId },
    })
    for (const field of FIELD_DEFINITIONS) validateField(field.fieldId, 'submit')
    if (Object.keys(errors.value).length) {
      tracker.emitAppEvent({
        formId: 'service-request',
        type: 'submit.rejected',
        payload: { attemptId },
      })
      await nextTick()
      document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus()
      return
    }
    stopTracking()
    const completed = tracker.emitAppEvent({
      formId: 'service-request',
      type: 'trial.completed',
      payload: { attemptId, submitTs: submission.ts },
    })
    active.value = false
    finalWrite = getQueue().finish(trial.id, completed, normalizeServiceRequest(values.value))
    saving.value = true
    try {
      await finalWrite
      await retryUpload()
    } catch (error) {
      message.value = error instanceof Error ? error.message : 'Uložení se nezdařilo.'
    }
  }

  async function abortTrial(reason = 'participant-skip') {
    if (!trial || !tracker || !active.value) return
    stopTracking()
    const aborted = tracker.emitAppEvent({
      formId: 'service-request',
      type: 'trial.aborted',
      payload: { reason },
    })
    active.value = false
    finalWrite = getQueue().finish(trial.id, aborted)
    saving.value = true
    await finalWrite
    await retryUpload()
  }

  onBeforeUnmount(stopTracking)
  return {
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
  }
}
