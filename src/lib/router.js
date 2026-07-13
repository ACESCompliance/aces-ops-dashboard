import { useEffect, useState } from 'react'

// Minimal hash router: '#/sites/abc' → ['sites', 'abc'].
// Hash routing keeps the SPA redirect rule untouched and survives refreshes.
function parse() {
  const h = window.location.hash.replace(/^#\/?/, '')
  return h.split('/').filter(Boolean).map(decodeURIComponent)
}

export function useRoute() {
  const [parts, setParts] = useState(parse)
  useEffect(() => {
    const onChange = () => {
      setParts(parse())
      window.scrollTo(0, 0)
    }
    window.addEventListener('hashchange', onChange)
    return () => window.removeEventListener('hashchange', onChange)
  }, [])
  return parts
}

export function navigate(path) {
  window.location.hash = '/' + path
}

export const href = (path) => '#/' + path
