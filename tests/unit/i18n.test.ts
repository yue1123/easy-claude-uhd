import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { i18n, setLocale, getInitialLocale, LOCALE_STORAGE_KEY } from '@/i18n'

describe('i18n locale persistence', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    localStorage.clear()
    // restore default so other component tests are not affected
    i18n.global.locale.value = 'en'
  })

  it('setLocale applies the locale to the running i18n instance', () => {
    setLocale('zh')
    expect(i18n.global.locale.value).toBe('zh')
  })

  it('setLocale persists the choice to localStorage', () => {
    setLocale('zh')
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('zh')
  })

  it('getInitialLocale returns the persisted locale', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'zh')
    expect(getInitialLocale()).toBe('zh')
  })

  it('getInitialLocale falls back to "en" when nothing is stored', () => {
    expect(getInitialLocale()).toBe('en')
  })

  it('getInitialLocale ignores an invalid stored value', () => {
    localStorage.setItem(LOCALE_STORAGE_KEY, 'fr')
    expect(getInitialLocale()).toBe('en')
  })
})
