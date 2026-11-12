/**
 * Unit tests for `app/lib/service-request.ts`.
 *
 * Covers the study-form contract: field definitions, required-field errors, canonical
 * formats for dates and contact data, option normalization, and comparison against the
 * scenario answers assigned to a trial.
 */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import {
  createEmptyServiceRequest,
  FIELD_DEFINITIONS,
  normalizeFieldValue,
  normalizeServiceRequest,
  parsePreferredDate,
  validateServiceRequest,
} from '../app/lib/service-request.ts'
import { createValidValues } from './helpers/service-request.ts'

describe('app/lib/service-request', () => {
  test('all twelve questions are required, with initially empty priority', () => {
    const empty = createEmptyServiceRequest()
    assert.equal(empty.priority, '')
    assert.equal(FIELD_DEFINITIONS.length, 12)
    const issues = validateServiceRequest(empty)
    assert.equal(issues.length, 12)
    assert.ok(issues.every((issue) => issue.ruleId === 'required'))
    assert.equal('note' in empty, false)
  })

  test('copyable option labels are ASCII in both interfaces', () => {
    for (const field of FIELD_DEFINITIONS) {
      for (const option of field.options ?? []) {
        assert.match(option.label, /^[\x20-\x7e]+$/)
      }
    }
  })

  test('Czech and ISO dates agree without losing the year', () => {
    assert.equal(parsePreferredDate('15. 4. 2026'), '2026-04-15')
    assert.equal(parsePreferredDate('2026-04-15'), '2026-04-15')
    assert.equal(parsePreferredDate('29. 2. 2024'), '2024-02-29')
    assert.equal(parsePreferredDate('29. 2. 2000'), '2000-02-29')
    for (const invalid of [
      '15. 4.',
      '31. 4. 2026',
      '29. 2. 2026',
      '29. 2. 1900',
      '2026-13-01',
      '0000-01-01',
    ]) {
      assert.equal(parsePreferredDate(invalid), null, invalid)
      assert.equal(normalizeFieldValue('preferredDate', invalid), invalid)
    }
  })

  test('supported phone and postal formats have one canonical representation', () => {
    for (const value of ['777601248', '+420 777 601 248', '00420 777-601-248']) {
      assert.equal(normalizeFieldValue('phone', value), '+420777601248')
    }
    assert.equal(normalizeFieldValue('zipCode', '130 00'), '13000')
    const invalid = createValidValues()
    invalid.phone = '+421777601248'
    invalid.zipCode = '1300'
    const issues = validateServiceRequest(invalid)
    assert.deepEqual(
      issues.map((issue) => issue.ruleId),
      ['phone-format', 'zip-code-format'],
    )
  })

  test('labels and codes normalize but arbitrary text and prefixes remain invalid', () => {
    assert.equal(normalizeFieldValue('priority', ' STANDARDNÍ '), 'standard')
    assert.equal(normalizeFieldValue('issueCategory', 'Voda a odpad'), 'voda')
    assert.equal(normalizeFieldValue('objectType', 'Rodinny dum'), 'dum')
    assert.equal(normalizeFieldValue('priority', 'st'), 'st')
    const values = createValidValues()
    values.priority = 'st'
    const issues = validateServiceRequest(values)
    assert.equal(issues[0]?.ruleId, 'option-value')
  })

  test('equivalent notation matches the assigned answers; another valid answer does not', () => {
    const expected = createValidValues()
    const values = createValidValues()
    values.phone = '777601248'
    values.preferredDate = '15.4.2026'
    values.objectType = 'Byt'
    values.zipCode = '13000'
    assert.deepEqual(validateServiceRequest(values, expected), [])
    values.city = 'Brno'
    assert.deepEqual(validateServiceRequest(values, expected), [
      {
        fieldId: 'city',
        ruleId: 'scenario-mismatch',
        message: 'Údaj neodpovídá zadání. Zkontrolujte jej prosím.',
      },
    ])
  })

  test('invalid transport values cannot become accidental valid answers', () => {
    const normalized = normalizeServiceRequest({
      fullName: 42,
      phone: null,
      note: {},
      city: ' Praha 3 ',
    })
    assert.equal(normalized.fullName, '')
    assert.equal(normalized.phone, '')
    assert.equal('note' in normalized, false)
    assert.equal(normalized.city, 'Praha 3')
    assert.deepEqual(normalizeServiceRequest(null), createEmptyServiceRequest())
    assert.deepEqual(normalizeServiceRequest([]), createEmptyServiceRequest())
  })
})
