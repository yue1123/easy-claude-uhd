import { createI18n } from 'vue-i18n'
import { en } from './en'
import { zh } from './zh'

export type Locale = 'en' | 'zh'

export const LOCALE_STORAGE_KEY = 'cc-hud.locale'

const SUPPORTED_LOCALES: Locale[] = ['en', 'zh']

/** Read the persisted UI locale, falling back to 'en' when absent or invalid. */
export function getInitialLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY)
    if (stored && (SUPPORTED_LOCALES as string[]).includes(stored)) {
      return stored as Locale
    }
  } catch {
    // localStorage may be unavailable (private mode, disabled) — fall through.
  }
  return 'en'
}

export const i18n = createI18n({
  legacy: false,
  locale: getInitialLocale(),
  fallbackLocale: 'en',
  messages: { en, zh },
})

/** Apply the given locale and persist the choice so it survives a reload. */
export function setLocale(locale: Locale) {
  i18n.global.locale.value = locale
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, locale)
  } catch {
    // Persisting is best-effort; ignore storage failures.
  }
}
