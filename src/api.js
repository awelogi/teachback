import { rpcDemo } from './demo.js'

export const DEMO = import.meta.env.VITE_DEMO === '1'
const URL_DASAR = (import.meta.env.VITE_SUPABASE_URL || '').replace(/\/$/, '')
const KUNCI = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const siap = DEMO || Boolean(URL_DASAR && KUNCI)

// Semua akses data lewat fungsi database (RPC); tabel tidak bisa dibaca langsung dari browser.
export async function rpc(fungsi, args = {}) {
  if (DEMO) return rpcDemo(fungsi, args)
  const headers = { 'Content-Type': 'application/json', apikey: KUNCI }
  if (KUNCI.startsWith('eyJ')) headers.Authorization = `Bearer ${KUNCI}`
  let r
  try {
    r = await fetch(`${URL_DASAR}/rest/v1/rpc/${fungsi}`, { method: 'POST', headers, body: JSON.stringify(args) })
  } catch {
    throw new Error('Tidak ada koneksi internet')
  }
  let data = null
  try { data = await r.json() } catch { /* respons kosong */ }
  if (!r.ok) throw new Error((data && data.message) || 'Terjadi kesalahan, coba lagi')
  return data
}

export const fmt = (n) => (n === null || n === undefined ? '—' : Number(n).toFixed(2).replace('.', ','))
