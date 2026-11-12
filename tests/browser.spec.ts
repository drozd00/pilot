/**
 * Browser tests for the standard (variant A) service-request form.
 *
 * Domain: keyboard and pointer interaction with native and Reka UI controls, forward and
 * backward focus order, open-select Tab behavior, and selection cancellation/confirmation.
 */
import { expect, test } from '@playwright/test'
import { openSelect, startStandardForm } from './helpers/browser'

test.describe('standard service-request form', () => {
  test('closed standard fields follow the normal forward and backward tab order', async ({
    page,
  }) => {
    await startStandardForm(page)
    const city = page.locator('#standard-city')
    const objectType = page.locator('#standard-objectType')
    const issueCategory = page.locator('#standard-issueCategory')
    const priority = page.getByRole('radio', { name: 'Urgentni', exact: true })
    const preferredDate = page.locator('#standard-preferredDate')
    const timeWindow = page.locator('#standard-timeWindow')
    const submit = page.getByRole('button', { name: 'Odeslat formulář' })

    await city.focus()
    await page.keyboard.press('Tab')
    await expect(objectType).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(issueCategory).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(priority).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(issueCategory).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(objectType).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(city).toBeFocused()

    await timeWindow.focus()
    await page.keyboard.press('Tab')
    await expect(submit).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(timeWindow).toBeFocused()
    await page.keyboard.press('Shift+Tab')
    await expect(preferredDate).toBeFocused()
  })

  for (const method of ['keyboard', 'pointer'] as const) {
    test(`Tab leaves every open standard select in either direction after ${method} opening`, async ({
      page,
    }) => {
      await startStandardForm(page)
      const priorityLabel = method === 'pointer' ? 'Nizka' : 'Urgentni'
      const priority = page.getByRole('radio', { name: priorityLabel, exact: true })
      if (method === 'pointer') {
        await priority.click()
        await expect(priority).toBeChecked()
      }
      const navigationCases = [
        {
          trigger: page.locator('#standard-objectType'),
          previous: page.locator('#standard-city'),
          next: page.locator('#standard-issueCategory'),
        },
        {
          trigger: page.locator('#standard-issueCategory'),
          previous: page.locator('#standard-objectType'),
          next: priority,
        },
        {
          trigger: page.locator('#standard-timeWindow'),
          previous: page.locator('#standard-preferredDate'),
          next: page.getByRole('button', { name: 'Odeslat formulář' }),
        },
      ]

      for (const navigationCase of navigationCases) {
        for (const backwards of [false, true]) {
          await openSelect(page, navigationCase.trigger, method)
          await page.keyboard.press('ArrowDown')
          const options = page.getByRole('option')
          const secondOption = options.nth(1)
          await expect(secondOption).toBeFocused()
          const key = backwards ? 'Shift+Tab' : 'Tab'
          const destination = backwards ? navigationCase.previous : navigationCase.next
          await page.keyboard.press(key)
          const listbox = page.getByRole('listbox')
          await expect(listbox).toBeHidden()
          await expect(navigationCase.trigger).toHaveAttribute('aria-expanded', 'false')
          await expect(destination).toBeFocused()
          await expect(navigationCase.trigger).toContainText('Vyberte možnost')
        }
      }
    })
  }

  test('Escape cancels, Enter selects, and Tab preserves the selected standard option', async ({
    page,
  }) => {
    await startStandardForm(page)
    const trigger = page.locator('#standard-objectType')
    const nextField = page.locator('#standard-issueCategory')
    const listbox = page.getByRole('listbox')
    const houseOption = page.getByRole('option', { name: 'Rodinny dum', exact: true })
    const officeOption = page.getByRole('option', { name: 'Kancelar', exact: true })

    await openSelect(page, trigger, 'keyboard')
    await page.keyboard.press('ArrowDown')
    await expect(houseOption).toBeFocused()
    await page.keyboard.press('Escape')
    await expect(listbox).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText('Vyberte možnost')

    await openSelect(page, trigger, 'keyboard')
    await page.keyboard.press('ArrowDown')
    await expect(houseOption).toBeFocused()
    await page.keyboard.press('Enter')
    await expect(listbox).toBeHidden()
    await expect(trigger).toBeFocused()
    await expect(trigger).toContainText('Rodinny dum')

    await openSelect(page, trigger, 'keyboard')
    await page.keyboard.press('ArrowDown')
    await expect(officeOption).toBeFocused()
    await page.keyboard.press('Tab')
    await expect(listbox).toBeHidden()
    await expect(nextField).toBeFocused()
    await expect(trigger).toContainText('Rodinny dum')
  })
})
