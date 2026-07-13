// Session auth. The ops password is never shipped in the bundle — the user
// types it, we verify it against the server (which checks OPS_PASSWORD), and
// keep it in sessionStorage to sign subsequent API calls via the x-ops-key
// header.
const STORAGE_KEY = 'aces_ops_key'

export function getKey() {
  try {
    return sessionStorage.getItem(STORAGE_KEY) || ''
  } catch {
    return ''
  }
}

export function isAuthed() {
  return getKey() !== ''
}

export function setKey(key) {
  try {
    sessionStorage.setItem(STORAGE_KEY, key)
  } catch {
    /* ignore */
  }
}

export function clearKey() {
  try {
    sessionStorage.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

// Ask the server whether this key is valid (cheap ping — no data returned).
export async function verifyKey(key) {
  const res = await fetch('/api/data?ping=1', { headers: { 'x-ops-key': key } })
  return res.ok
}
