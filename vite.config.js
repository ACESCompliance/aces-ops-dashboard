import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// During `netlify dev` the functions are proxied automatically. For a plain
// `vite dev` (no functions), point VITE_API_BASE at a running `netlify dev`
// instance if you want live data without the Netlify proxy.
export default defineConfig({
  plugins: [react()],
  define: {
    // Stamped at build time so the App Health panel can show the deploy date.
    __BUILD_TIME__: JSON.stringify(
      new Date().toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }),
    ),
  },
})
