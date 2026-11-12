import type { InputTrackerEvent } from 'input-tracker'
import type { ServiceRequest } from './service-request'

export const MEASURED_RUNS_PER_VARIANT = 2
export const RUNS_PER_VARIANT = MEASURED_RUNS_PER_VARIANT + 1
export const PAUSE_BETWEEN_BLOCKS_MS = 30_000
export const ESTIMATED_SESSION_MINUTES = 15

export interface Trial {
  id: string
  session_id: string
  ordinal: number
  variant: 'A' | 'B'
  phase: 'familiarization' | 'measured'
  repetition: number
  scenario_id: string
  scenario: {
    label: string
    values: ServiceRequest
  }
  status: 'ready' | 'running' | 'completed' | 'aborted' | 'interrupted'
  page_id?: string
  started_at?: string
  ended_at?: string
}

export interface StudySession {
  id: string
  participant_code: string
  group_code: 'AX_BY' | 'AY_BX' | 'BX_AY' | 'BY_AX'
  protocol_version: string
  dataset_kind: 'preflight' | 'pilot'
  study_id: string
}

export interface SessionResponse {
  session: StudySession
  trials: Trial[]
}

export interface EventBatch {
  schemaVersion: 1
  batchId: string
  trialId: string
  events: InputTrackerEvent[]
}

export interface IngestAck {
  batchId: string
  accepted: number
}
