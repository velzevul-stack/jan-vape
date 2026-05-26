const STORAGE_KEY_NAME = 'customer.name'
const STORAGE_KEY_TELEGRAM = 'customer.telegram'

export interface CustomerProfile {
  name: string
  telegram: string
}

function hasWindow(): boolean {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function readCustomerProfile(): CustomerProfile {
  if (!hasWindow()) return { name: '', telegram: '' }
  try {
    return {
      name: window.localStorage.getItem(STORAGE_KEY_NAME) ?? '',
      telegram: window.localStorage.getItem(STORAGE_KEY_TELEGRAM) ?? '',
    }
  } catch {
    return { name: '', telegram: '' }
  }
}

export function writeCustomerName(name: string): void {
  if (!hasWindow()) return
  try {
    if (name) window.localStorage.setItem(STORAGE_KEY_NAME, name)
    else window.localStorage.removeItem(STORAGE_KEY_NAME)
  } catch {
    return
  }
}

export function writeCustomerTelegram(telegram: string): void {
  if (!hasWindow()) return
  try {
    if (telegram) window.localStorage.setItem(STORAGE_KEY_TELEGRAM, telegram)
    else window.localStorage.removeItem(STORAGE_KEY_TELEGRAM)
  } catch {
    return
  }
}

export function clearCustomerProfile(): void {
  if (!hasWindow()) return
  try {
    window.localStorage.removeItem(STORAGE_KEY_NAME)
    window.localStorage.removeItem(STORAGE_KEY_TELEGRAM)
  } catch {
    return
  }
}
