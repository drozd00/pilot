import { expect, type Locator, type Page } from '@playwright/test'

/**
 * Opens the standard form and waits until its first field is interactive.
 *
 * The form only mounts its fields after a study trial has started, so tests must click
 * through the start screen instead of asserting immediately after navigation.
 */
export async function startStandardForm(page: Page) {
  await page.goto('/test/varianta-a')
  await page.waitForFunction(() => {
    const nuxtRoot = document.querySelector('#__nuxt')
    return Boolean(nuxtRoot && '__vue_app__' in nuxtRoot)
  })
  const startButton = page.getByRole('button', { name: 'Zahájit běh' })
  await startButton.click()
  const firstField = page.locator('#standard-fullName')
  await expect(firstField).toBeVisible()
}

/**
 * Opens a listbox-backed select with either the keyboard or the pointer.
 *
 * Asserting the shared open state keeps each caller focused on what happens next.
 */
export async function openSelect(page: Page, trigger: Locator, method: 'keyboard' | 'pointer') {
  if (method === 'pointer') {
    await trigger.click()
  } else {
    await trigger.focus()
    await page.keyboard.press('Enter')
  }
  const listbox = page.getByRole('listbox')
  await expect(listbox).toBeVisible()
  await expect(trigger).toHaveAttribute('aria-expanded', 'true')
  const focusedOption = page.locator('[role="option"]:focus')
  await expect(focusedOption).toBeVisible()
}
