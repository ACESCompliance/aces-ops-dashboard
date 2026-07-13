import { useState } from 'react'
import { PASSWORD, setAuthed } from '../lib/auth'

export default function Login({ onSuccess }) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function submit(e) {
    e.preventDefault()
    if (value === PASSWORD) {
      setAuthed()
      onSuccess()
    } else {
      setError(true)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4">
      <form onSubmit={submit} className="card w-full max-w-sm text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-xl border border-accent/40 bg-accent/10">
          <span className="text-2xl font-extrabold text-accent">A</span>
        </div>
        <div className="mb-1 text-2xl font-extrabold tracking-tight text-ink">
          ACES <span className="text-accent">Ops</span>
        </div>
        <p className="mb-6 text-sm text-muted">Compliance command center</p>
        <input
          type="password"
          autoFocus
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          placeholder="Password"
          className="mb-3 w-full rounded-lg border border-line bg-bg px-3 py-2 text-ink outline-none placeholder:text-muted focus:border-accent/60"
        />
        {error && <p className="mb-3 text-sm text-bad">Incorrect password</p>}
        <button type="submit" className="btn w-full justify-center py-2.5">
          Unlock
        </button>
      </form>
    </div>
  )
}
