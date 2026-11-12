import { normalizeOptionText } from './service-request'
import type { FieldOption } from './service-request'

export function findMatchingOptions(options: readonly FieldOption[], query: string): FieldOption[] {
  const normalizedQuery = normalizeOptionText(query)
  const prefixMatches: FieldOption[] = []
  const otherMatches: FieldOption[] = []

  for (const option of options) {
    const code = normalizeOptionText(option.value)
    const label = normalizeOptionText(option.label)
    if (!normalizedQuery || code.startsWith(normalizedQuery) || label.startsWith(normalizedQuery)) {
      prefixMatches.push(option)
    } else if (code.includes(normalizedQuery) || label.includes(normalizedQuery)) {
      otherMatches.push(option)
    }
  }

  return [...prefixMatches, ...otherMatches]
}

export function findNextOption(
  options: readonly FieldOption[],
  highlightedValue: string,
  direction: 1 | -1,
): FieldOption | undefined {
  if (options.length === 0) {
    return undefined
  }

  const currentIndex = options.findIndex((option) => option.value === highlightedValue)
  if (currentIndex === -1) {
    return direction === 1 ? options[0] : options[options.length - 1]
  }

  const nextIndex = Math.max(0, Math.min(options.length - 1, currentIndex + direction))
  return options[nextIndex]
}
