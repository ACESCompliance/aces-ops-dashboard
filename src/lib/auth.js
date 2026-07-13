export const PASSWORD = 'aces2026'
const STORAGE_KEY = 'aces_ops_authed'

export function isAuthed() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

export function setAuthed() {
  try {
    sessionStorage.setItem(STORAGE_KEY, '1')
  } catch {
    /* ignore */
  }
}
