// ACES Ops — signed photo URLs.
//
// The audit app stores photos in the PRIVATE `app-audit-photos` bucket. This
// endpoint exchanges an audit_id for short-lived signed URLs so the ops
// dashboard can render the actual images without ever exposing the service
// role key or making the bucket public.
//
//   GET /api/photos?audit_id=<uuid> → { photos: [{ id, zone_label, status, url }] }

const SUPABASE_URL =
  process.env.SUPABASE_URL || 'https://wuwdmqkblrbigdoehbrv.supabase.co'
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const OPS_PASSWORD = process.env.OPS_PASSWORD || ''

const BUCKET = 'app-audit-photos'
const SIGN_TTL_SECONDS = 60 * 60 // 1 hour

const JSON_HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
}

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS })
}

const supaHeaders = (extra = {}) => ({
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  ...extra,
})

export default async (req) => {
  if (!SERVICE_KEY) return json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured.' }, 500)
  if (!OPS_PASSWORD) return json({ error: 'OPS_PASSWORD is not configured.' }, 500)

  const provided = req.headers.get('x-ops-key') || ''
  if (provided !== OPS_PASSWORD) return json({ error: 'Unauthorized' }, 401)

  const url = new URL(req.url)
  const auditId = url.searchParams.get('audit_id')
  if (!auditId || !/^[0-9a-f-]{36}$/i.test(auditId)) {
    return json({ error: 'A valid audit_id is required.' }, 400)
  }

  try {
    // Look up the audit's photo rows (id + storage path + labels).
    const params = new URLSearchParams({
      select: 'id,storage_path,zone_label,status,uploaded_at,analyzed_at',
      audit_id: `eq.${auditId}`,
      order: 'uploaded_at.asc',
    })
    const res = await fetch(`${SUPABASE_URL}/rest/v1/app_audit_photos?${params.toString()}`, {
      headers: supaHeaders(),
    })
    if (!res.ok) throw new Error(`${res.status} ${(await res.text()).slice(0, 160)}`)
    const rows = await res.json()

    // Sign each path. Storage sign API: POST /storage/v1/object/sign/<bucket>/<path>
    const photos = await Promise.all(
      rows.map(async (p) => {
        let signedUrl = null
        if (p.storage_path) {
          // Paths are sometimes stored with the bucket prefix — normalize.
          const path = p.storage_path.replace(new RegExp(`^${BUCKET}/`), '')
          const sres = await fetch(
            `${SUPABASE_URL}/storage/v1/object/sign/${BUCKET}/${path}`,
            {
              method: 'POST',
              headers: supaHeaders({ 'Content-Type': 'application/json' }),
              body: JSON.stringify({ expiresIn: SIGN_TTL_SECONDS }),
            },
          )
          if (sres.ok) {
            const body = await sres.json()
            // API returns { signedURL: "/object/sign/<bucket>/<path>?token=..." }
            signedUrl = body.signedURL ? `${SUPABASE_URL}/storage/v1${body.signedURL}` : null
          }
        }
        return {
          id: p.id,
          zone_label: p.zone_label,
          status: p.status,
          uploaded_at: p.uploaded_at,
          analyzed_at: p.analyzed_at,
          url: signedUrl,
        }
      }),
    )

    return json({ photos, expiresInSeconds: SIGN_TTL_SECONDS })
  } catch (e) {
    return json({ error: String(e.message || e) }, 500)
  }
}

export const config = { path: '/api/photos' }
