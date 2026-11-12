import type { FieldDefinition, FieldId } from './service-request'

export type InputStackField = FieldDefinition & {
  placeholder: string
  hint?: string
  inputmode?: 'text' | 'tel' | 'email' | 'numeric'
}

export type FieldCommit = {
  fieldId: FieldId
  trigger: 'blur' | 'enter'
}

export type { FieldOption as InputStackOption } from './service-request'
