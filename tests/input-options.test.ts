/**
 * Unit tests for `app/lib/input-options.ts`.
 *
 * Covers accent-insensitive option filtering and keyboard movement through the option
 * list. Source option objects must remain unchanged.
 */
import assert from 'node:assert/strict'
import { describe, test } from 'node:test'
import { findMatchingOptions, findNextOption } from '../app/lib/input-options.ts'

describe('app/lib/input-options', () => {
  test('option search accepts accented labels and codes without changing source options', () => {
    const options = [
      { value: 'dum', label: 'Rodinný dům' },
      { value: 'byt', label: 'Byt' },
    ]
    assert.deepEqual(findMatchingOptions(options, 'rodinny'), [options[0]])
    assert.deepEqual(findMatchingOptions(options, 'du'), [options[0]])
    assert.deepEqual(findMatchingOptions(options, 'nonsense'), [])
    assert.equal(options[0]?.label, 'Rodinný dům')
    assert.equal(findNextOption(options, '', -1), options[1])
    assert.equal(findNextOption(options, 'dum', 1), options[1])
    assert.equal(findNextOption(options, 'byt', 1), options[1])
    assert.equal(findNextOption([], '', 1), undefined)
  })
})
