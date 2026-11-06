import { useCallback, useEffect, useRef, useState } from 'react'
import { rpc, siap, fmt, DEMO } from './api.js'

const SEGMEN = {
  1: 'Sport & Physical Wellness',
  2: 'Personal Wellness & Safety',
  3: 'Communication & Creative Skills',
  4: 'Digital & Professional Skills',
}

const ASPEK = {
  isi: {
    judul: 'Isi & Relevansi',
    petunjuk: ['Alasan belajar dan tujuannya jelas', 'Manfaatnya nyata dan bisa dipakai', 'Materinya benar dan aman'],
  },
  praktik: {
    judul: 'Praktik & Demonstrasi',
    petunjuk: ['Penonton diajak mencoba langsung', 'Langkahnya jelas, saya bisa menirunya', 'Peran presenter, demonstrator, fasilitator berjalan'],
  },
  penyampaian: {
    judul: 'Penyampaian & Kerja Tim',
    petunjuk: ['Jelas, hidup, dan menarik disimak', 'Semua anggota terlibat', 'Selesai dalam waktu yang diberikan'],
  },
  tanya_jawab: {
    judul: 'Tanya Jawab',
    petunjuk: ['Pertanyaan dijawab jelas, tepat, dan percaya diri'],
  },
}

const SKALA = [
  [1, 'Kurang'],
  [3, 'Cukup'],
  [5, 'Sangat baik'],
]

const NAMA_PERAN = { kelompok: 'Kelompok', zona: 'Pembina Zona', juri: 'Juri', admin: 'Admin' }

/* ------------------------------------------------------------------ */
/* akar                                                                 */
/* ------------------------------------------------------------------ */
export default function App() {
  const [sesi, setSesi] = useState(() => {
    try { return JSON.parse(localStorage.getItem('tb_sesi') || 'null') } catch { return null }
  })
  const masuk = (s) => {
    try { localStorage.setItem('tb_sesi', JSON.stringify(s)) } catch { /* abaikan */ }
    setSesi(s)
  }
  const keluar = useCallback(() => {
    try { localStorage.removeItem('tb_sesi') } catch { /* abaikan */ }
    setSesi(null)
  }, [])
  if (!siap) {
    return (
      <div className="layar-tengah"><div className="kartu peringatan">
        <h2>Belum terhubung ke database</h2>
        <p>Isi <b>VITE_SUPABASE_URL</b> dan <b>VITE_SUPABASE_ANON_KEY</b> lalu build ulang (lihat README).</p>
      </div></div>
    )
  }
  return sesi ? <Sesi sesi={sesi} keluar={keluar} /> : <Login onMasuk={masuk} />
}

/* ------------------------------------------------------------------ */
/* login                                                                */
/* ------------------------------------------------------------------ */
function Login({ onMasuk }) {
  const [kode, setKode] = useState('')
  const [pin, setPin] = useState('')
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)

  async function kirim(e, k = kode, p = pin) {
    if (e) e.preventDefault()
    if (!k.trim() || !p.trim()) { setGalat('Isi kode dan PIN dulu'); return }
    setGalat(''); setSibuk(true)
    try {
      await rpc('tb_masuk', { p_kode: k, p_pin: p })
      onMasuk({ kode: k.trim().toUpperCase(), pin: p.trim() })
    } catch (err) {
      setGalat(err.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="login-latar">
      <div className="login">
        <div className="merek">
          <img src="./logo-nlo.png" alt="" />
          <span>Need Learning Organizer</span>
        </div>
        <div className="eyebrow">Program Pembinaan MP</div>
        <h1>Teach Back Day</h1>
        <p className="tagline">Learn it, share it, teach it.</p>

        <form onSubmit={kirim}>
          <label className="field">
            <span>Kode</span>
            <input value={kode} onChange={(e) => setKode(e.target.value)} placeholder="Contoh: K09"
                   autoCapitalize="characters" autoComplete="off" autoCorrect="off" />
          </label>
          <label className="field">
            <span>PIN</span>
            <input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="••••" inputMode="numeric"
                   type="password" autoComplete="off" />
          </label>
          {galat && <div className="galat">{galat}</div>}
          <button className="tombol utama penuh" disabled={sibuk}>{sibuk ? 'Memeriksa…' : 'Masuk'}</button>
        </form>

        {DEMO ? (
          <div className="demo-kotak">
            <div className="demo-judul">Mode demo</div>
            <p>Peserta K01–K17, Pembina Z1–Z4, Juri J1–J3 dengan PIN 1234. Admin dengan PIN 0000.</p>
            <div className="demo-tombol">
              {[['K01', '1234', 'Peserta'], ['Z4', '1234', 'Pembina'], ['J1', '1234', 'Juri'], ['ADMIN', '0000', 'Admin']].map(([k, p, n]) => (
                <button key={k} type="button" onClick={() => kirim(null, k, p)}>{n}</button>
              ))}
            </div>
          </div>
        ) : (
          <p className="catatan">Kode dan PIN dibagikan oleh panitia.</p>
        )}
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* sesi                                                                 */
/* ------------------------------------------------------------------ */
function Sesi({ sesi, keluar }) {
  const [st, setSt] = useState(null)
  const [galat, setGalat] = useState('')
  const [toast, setToast] = useState('')
  const timer = useRef(null)

  const muat = useCallback(async () => {
    try {
      const d = await rpc('tb_status', { p_kode: sesi.kode, p_pin: sesi.pin })
      setSt(d); setGalat('')
    } catch (e) {
      if (/PIN salah/.test(e.message)) keluar()
      else setGalat(e.message)
    }
  }, [sesi, keluar])

  useEffect(() => {
    muat()
    const t = setInterval(muat, 6000)
    const lihat = () => { if (!document.hidden) muat() }
    document.addEventListener('visibilitychange', lihat)
    return () => { clearInterval(t); document.removeEventListener('visibilitychange', lihat) }
  }, [muat])

  const info = useCallback((teks) => {
    setToast(teks)
    clearTimeout(timer.current)
    timer.current = setTimeout(() => setToast(''), 2600)
  }, [])

  if (!st) return <div className="layar-tengah"><div className="memuat">{galat || 'Memuat…'}</div></div>

  const a = st.akses
  const sub = a.peran === 'kelompok' ? `Kelompok ${a.kelompok}`
    : a.peran === 'zona' ? `Pembina Zona ${a.segmen}` : a.nama
  return (
    <>
      <header className="kepala">
        <div className="kepala-isi">
          <img src="./logo-nlo.png" alt="" />
          <div className="judul">
            <span className="nama-app">Teach Back Day</span>
            <span className="siapa">{sub}</span>
          </div>
          <button className="keluar" onClick={keluar}>Keluar</button>
        </div>
      </header>
      <main className="app">
        {galat && <div className="pita kuning">Koneksi terputus. Mencoba lagi otomatis…</div>}
        {a.peran === 'admin'
          ? <Admin st={st} sesi={sesi} muat={muat} info={info} />
          : <Penilai st={st} sesi={sesi} muat={muat} info={info} />}
      </main>
      {toast && <div className="toast">{toast}</div>}
    </>
  )
}

/* ------------------------------------------------------------------ */
/* penilai: kelompok, pembina zona, juri                                */
/* ------------------------------------------------------------------ */
function teksPetunjuk(st) {
  const p = st.akses.peran
  if (st.fase === 'selesai') return 'Terima kasih sudah ikut belajar dan mengajar hari ini.'
  if (st.fase === 'tahap1') {
    if (p === 'kelompok') return 'Nilai kelompok lain di segmenmu setelah mereka tampil. Diskusikan bersama anggota kelompok, lalu satu orang yang mengisi.'
    if (p === 'zona') return 'Nilaimu dihitung sebagai satu suara tambahan di segmen ini.'
    return 'Juri menilai pada babak final. Tunggu finalis diumumkan.'
  }
  if (p === 'kelompok') return 'Nilai setiap finalis setelah tampil. Diskusikan bersama kelompok, lalu satu orang yang mengisi.'
  if (p === 'juri') return st.aktif ? 'Nilaimu dihitung 40% dari skor akhir finalis.' : 'Akun juri ini tidak aktif untuk acara hari ini.'
  return 'Babak final dinilai oleh kelompok dan juri.'
}

function Penilai({ st, sesi, muat, info }) {
  const [buka, setBuka] = useState(null)
  const a = st.akses
  const target = st.targets.find((t) => t.nomor === buka)
  const total = st.targets.length
  const sudah = st.targets.filter((t) => t.nilai).length
  const pct = total ? Math.round((sudah / total) * 100) : 0

  async function simpan(nomor, skor) {
    await rpc('tb_nilai_simpan', {
      p_kode: sesi.kode, p_pin: sesi.pin, p_dinilai: nomor,
      p_isi: skor.isi, p_praktik: skor.praktik, p_penyampaian: skor.penyampaian,
      p_tanya_jawab: skor.tanya_jawab ?? null,
    })
    await muat()
    info(`Nilai Kelompok ${nomor} tersimpan`)
  }

  async function pilihTerbaik(nomor) {
    try {
      await rpc('tb_suara_simpan', { p_kode: sesi.kode, p_pin: sesi.pin, p_untuk: nomor })
      await muat()
      info(`Kelompok ${nomor} dipilih sebagai terbaik`)
    } catch (e) { info(e.message) }
  }

  const eyebrow = st.fase === 'tahap1' ? `Tahap 1 · Segmen ${a.segmen ?? '–'}` : st.fase === 'final' ? 'Babak Final' : 'Selesai'
  const judul = st.fase === 'tahap1' ? (a.segmen_nama || 'Seleksi per segmen') : st.fase === 'final' ? '4 Besar Teach Back' : 'Acara selesai'

  return (
    <>
      <section className="hero">
        <div className="eyebrow">{eyebrow}</div>
        <h2>{judul}</h2>
        <p>{teksPetunjuk(st)}</p>
        {total > 0 && (
          <div className="progres">
            <div className="progres-bar"><span style={{ width: `${pct}%` }} /></div>
            <span className="progres-teks">{sudah}/{total} dinilai</span>
          </div>
        )}
        {st.terkunci && st.fase !== 'selesai' && <div className="lencana merah">Penilaian ditutup</div>}
      </section>

      {st.hasil && st.hasil.length > 0 && (
        <section className="kartu">
          <h3 className="judul-bagian">Hasil Final</h3>
          <ol className="podium">
            {st.hasil.map((h) => (
              <li key={h.nomor} className={`juara-${h.peringkat}`}>
                <span className="peringkat">{h.peringkat}</span>
                <span className="isi"><b>Kelompok {h.nomor}</b><small>{h.materi}</small></span>
              </li>
            ))}
          </ol>
        </section>
      )}

      {st.finalis && st.finalis.length > 0 && (
        <section className="kartu">
          <h3 className="judul-bagian">Finalis 4 Besar</h3>
          <ul className="daftar-finalis">
            {st.finalis.map((f) => (
              <li key={f.nomor}>
                <span className="no-kecil">{f.nomor}</span>
                <span className="isi"><small>{f.segmen_nama}</small><b>{f.materi}</b></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {total > 0 && (
        <section>
          <h3 className="judul-bagian luar">Kelompok yang dinilai</h3>
          <div className="daftar">
            {st.targets.map((t) => (
              <button key={t.nomor} className="baris" onClick={() => setBuka(t.nomor)}>
                <span className="no">{t.nomor}</span>
                <span className="isi">
                  <b>{t.materi}</b>
                  <small>Kelompok {t.nomor}</small>
                </span>
                <span className={`status ${t.nilai ? 'ok' : ''}`}>{t.nilai ? 'Dinilai' : 'Belum'}</span>
                <span className="panah" aria-hidden>›</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {st.fase === 'tahap1' && a.peran === 'kelompok' && total > 0 && (
        <section>
          <h3 className="judul-bagian luar">Kelompok terbaik di segmenmu</h3>
          <p className="keterangan">Pilih satu. Dipakai hanya kalau ada nilai yang sama.</p>
          <div className="daftar">
            {st.targets.map((t) => {
              const on = st.suara === t.nomor
              return (
                <button key={t.nomor} disabled={st.terkunci} className={`pilihan ${on ? 'on' : ''}`}
                        onClick={() => pilihTerbaik(t.nomor)}>
                  <span className="radio" />
                  <span className="isi"><b>{t.materi}</b><small>Kelompok {t.nomor}</small></span>
                </button>
              )
            })}
          </div>
        </section>
      )}

      {target && (
        <Lembar key={`${st.fase}-${target.nomor}`} target={target} aspek={st.aspek} terkunci={st.terkunci}
                onSimpan={simpan} onTutup={() => setBuka(null)} />
      )}
    </>
  )
}

function Lembar({ target, aspek, terkunci, onSimpan, onTutup }) {
  const [skor, setSkor] = useState(() => ({ ...(target.nilai || {}) }))
  const [galat, setGalat] = useState('')
  const [sibuk, setSibuk] = useState(false)
  const terisi = aspek.filter((k) => skor[k]).length
  const lengkap = terisi === aspek.length

  async function kirim() {
    setGalat(''); setSibuk(true)
    try {
      await onSimpan(target.nomor, skor)
      onTutup()
    } catch (e) {
      setGalat(e.message)
    } finally {
      setSibuk(false)
    }
  }

  return (
    <div className="tirai" onClick={(e) => { if (e.target === e.currentTarget) onTutup() }}>
      <div className="lembar" role="dialog">
        <div className="lembar-kepala">
          <div>
            <div className="eyebrow">Kelompok {target.nomor}</div>
            <h2>{target.materi}</h2>
          </div>
          <button className="tutup-x" onClick={onTutup} aria-label="Tutup">×</button>
        </div>

        <div className="lembar-isi">
          {aspek.map((k, i) => (
            <div className="aspek" key={k}>
              <div className="aspek-judul"><span className="urut">{i + 1}</span>{ASPEK[k].judul}</div>
              <ul>{ASPEK[k].petunjuk.map((p) => <li key={p}>{p}</li>)}</ul>
              <div className="skala">
                {SKALA.map(([n, label]) => (
                  <button key={n} disabled={terkunci} className={skor[k] === n ? 'on' : ''}
                          onClick={() => setSkor((s) => ({ ...s, [k]: n }))}>
                    <span className="angka">{n}</span>
                    <span className="label">{label}</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="lembar-kaki">
          {galat && <div className="galat">{galat}</div>}
          <button className="tombol utama penuh" disabled={!lengkap || sibuk || terkunci} onClick={kirim}>
            {terkunci ? 'Penilaian ditutup'
              : sibuk ? 'Menyimpan…'
              : !lengkap ? `Lengkapi penilaian (${terisi}/${aspek.length})`
              : target.nilai ? 'Perbarui nilai' : 'Simpan nilai'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/* admin                                                                */
/* ------------------------------------------------------------------ */
function Admin({ st, sesi, muat, info }) {
  const [tab, setTab] = useState('kontrol')
  const [rekap, setRekap] = useState(null)
  const [akses, setAkses] = useState(null)
  const [galat, setGalat] = useState('')
  const [layar, setLayar] = useState(false)
  const args = { p_kode: sesi.kode, p_pin: sesi.pin }

  const muatRekap = useCallback(async () => {
    try { setRekap(await rpc('tb_admin_rekap', { p_kode: sesi.kode, p_pin: sesi.pin })); setGalat('') }
    catch (e) { setGalat(e.message) }
  }, [sesi])

  useEffect(() => {
    muatRekap()
    const t = setInterval(muatRekap, 8000)
    return () => clearInterval(t)
  }, [muatRekap])

  useEffect(() => {
    if (tab === 'akses' && !akses) {
      rpc('tb_admin_akses', args).then(setAkses).catch((e) => setGalat(e.message))
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab])

  async function ubah(patch, pesan) {
    try {
      await rpc('tb_admin_ubah', { ...args, p_patch: patch })
      await Promise.all([muat(), muatRekap()])
      if (pesan) info(pesan)
    } catch (e) { info(e.message) }
  }

  const label = { tahap1: 'Tahap 1', final: 'Final', selesai: 'Selesai' }[st.fase]

  if (layar) return <Layar st={st} sesi={sesi} onTutup={() => setLayar(false)} />

  return (
    <>
      <section className="hero ringkas">
        <div className="eyebrow">Panel Admin</div>
        <h2>Fase berjalan: {label}</h2>
      </section>
      <nav className="tab">
        {[['kontrol', 'Kontrol'], ['rekap', 'Rekap'], ['akses', 'Kode & PIN']].map(([k, n]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => setTab(k)}>{n}</button>
        ))}
      </nav>
      {galat && <div className="pita merah">{galat}</div>}
      {tab === 'kontrol' && <Kontrol st={st} rekap={rekap} ubah={ubah} args={args} muat={muat} muatRekap={muatRekap} info={info} bukaLayar={() => setLayar(true)} />}
      {tab === 'rekap' && <Rekap st={st} rekap={rekap} />}
      {tab === 'akses' && <Akses akses={akses} />}
    </>
  )
}

function Saklar({ buka, onClick }) {
  return (
    <button className={`saklar ${buka ? 'buka' : 'tutup'}`} onClick={onClick}>
      <span className="titik" />{buka ? 'Terbuka' : 'Ditutup'}
    </button>
  )
}

function Pilihan({ nilai, opsi, onPilih }) {
  return (
    <div className="segmented">
      {opsi.map(([k, n]) => (
        <button key={k} className={nilai === k ? 'on' : ''} onClick={() => onPilih(k, n)}>{n}</button>
      ))}
    </div>
  )
}

function Kontrol({ st, rekap, ubah, args, muat, muatRekap, info, bukaLayar }) {
  const [pilih, setPilih] = useState(null)
  const [yakin, setYakin] = useState(false)
  const tutup = st.segmen_tutup || []
  const adaFinalis = (st.finalis_nos || []).length > 0

  const bawaan = {}
  for (const s of [1, 2, 3, 4]) {
    const sudahAda = (st.finalis || []).find((f) => f.segmen === s)
    const baris = (rekap?.tahap1 || []).filter((r) => r.segmen === s)
    bawaan[s] = sudahAda ? sudahAda.nomor : (baris[0]?.nomor ?? null)
  }
  const dipilih = { ...bawaan, ...(pilih || {}) }
  const seri = (s) => (rekap?.tahap1 || []).filter((r) => r.segmen === s && r.peringkat === 1 && r.n_suara > 0).length > 1

  async function umumkan() {
    const nos = [1, 2, 3, 4].map((s) => dipilih[s]).filter(Boolean)
    if (nos.length !== 4) { info('Pilih satu kelompok untuk tiap segmen'); return }
    await ubah({ finalis: nos }, '4 finalis diumumkan')
  }

  async function reset() {
    try {
      await rpc('tb_admin_reset', args)
      setYakin(false); setPilih(null)
      await Promise.all([muat(), muatRekap()])
      info('Semua nilai dikosongkan')
    } catch (e) { info(e.message) }
  }

  return (
    <>
      <section className="kartu">
        <h3 className="judul-bagian">Fase acara</h3>
        <Pilihan nilai={st.fase} opsi={[['tahap1', 'Tahap 1'], ['final', 'Final'], ['selesai', 'Selesai']]}
                 onPilih={(k, n) => ubah({ fase: k }, `Fase: ${n}`)} />
      </section>

      <section className="kartu">
        <h3 className="judul-bagian">Penilaian Tahap 1</h3>
        <p className="keterangan">Tutup segmen setelah semua kelompok selesai menilai.</p>
        <div className="baris-daftar">
          {[1, 2, 3, 4].map((s) => {
            const ditutup = tutup.includes(s)
            return (
              <div key={s} className="baris-pengaturan">
                <span className="no-kecil">{s}</span>
                <span className="isi">{SEGMEN[s]}</span>
                <Saklar buka={!ditutup}
                        onClick={() => ubah({ segmen_tutup: ditutup ? tutup.filter((x) => x !== s) : [...tutup, s] },
                                            ditutup ? `Segmen ${s} dibuka` : `Segmen ${s} ditutup`)} />
              </div>
            )
          })}
        </div>
      </section>

      <section className="kartu">
        <h3 className="judul-bagian">Finalis 4 besar</h3>
        <p className="keterangan">Otomatis peringkat 1 tiap segmen. Ubah manual bila perlu.</p>
        <div className="baris-daftar">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="baris-pengaturan">
              <span className="no-kecil">{s}</span>
              <select value={dipilih[s] ?? ''} onChange={(e) => setPilih({ ...(pilih || {}), [s]: Number(e.target.value) })}>
                {(rekap?.tahap1 || []).filter((r) => r.segmen === s).map((r) => (
                  <option key={r.nomor} value={r.nomor}>#{r.peringkat} · Kelompok {r.nomor} · {fmt(r.rata)}</option>
                ))}
              </select>
              {seri(s) && <span className="lencana merah">Seri</span>}
            </div>
          ))}
        </div>
        <div className="aksi">
          <button className="tombol utama" onClick={umumkan}>{adaFinalis ? 'Perbarui finalis' : 'Umumkan finalis'}</button>
          {adaFinalis && <button className="tombol sekunder" onClick={() => ubah({ finalis: [] }, 'Pengumuman ditarik')}>Tarik</button>}
        </div>
      </section>

      <section className="kartu">
        <h3 className="judul-bagian">Babak final</h3>
        <button className="tombol utama penuh" style={{ marginBottom: 14 }} disabled={!adaFinalis} onClick={bukaLayar}>
          {adaFinalis ? 'Buka Layar Utama (live)' : 'Layar Utama: umumkan finalis dulu'}
        </button>
        <div className="baris-pengaturan">
          <span className="isi">Penilaian final</span>
          <Saklar buka={!st.final_tutup}
                  onClick={() => ubah({ final_tutup: !st.final_tutup }, st.final_tutup ? 'Final dibuka' : 'Final ditutup')} />
        </div>
        <div className="sub-label">Jumlah juri</div>
        <Pilihan nilai={st.juri_aktif} opsi={[[2, '2 juri'], [3, '3 juri']]} onPilih={(k) => ubah({ juri_aktif: k }, `${k} juri aktif`)} />
        <div className="sub-label">Tampilkan hasil ke peserta</div>
        <Pilihan nilai={st.hasil_tampil} opsi={[[0, 'Sembunyi'], [3, 'Juara 1–3'], [4, 'Semua']]}
                 onPilih={(k, n) => ubah({ hasil_tampil: k }, `Hasil: ${n}`)} />
      </section>

      {DEMO && (
        <section className="kartu">
          <h3 className="judul-bagian">Khusus demo</h3>
          <p className="keterangan">Isi nilai acak untuk semua penilai pada fase berjalan.</p>
          <button className="tombol sekunder penuh" onClick={async () => { await rpc('tb_demo_isi', args); await Promise.all([muat(), muatRekap()]); info('Nilai contoh terisi') }}>
            Isi nilai contoh
          </button>
        </section>
      )}

      <section className="kartu bahaya">
        <h3 className="judul-bagian">Reset data latihan</h3>
        <p className="keterangan">Hapus semua nilai dan kembalikan pengaturan ke awal. Kode dan PIN tetap.</p>
        {!yakin
          ? <button className="tombol sekunder penuh" onClick={() => setYakin(true)}>Reset data…</button>
          : <div className="aksi">
              <button className="tombol bahaya" onClick={reset}>Ya, hapus semua</button>
              <button className="tombol sekunder" onClick={() => setYakin(false)}>Batal</button>
            </div>}
      </section>
    </>
  )
}

function Rekap({ st, rekap }) {
  if (!rekap) return <div className="memuat">Memuat…</div>
  const belum1 = rekap.progres_tahap1.filter((p) => p.sudah < p.harap)
  const belumF = rekap.progres_final.filter((p) => p.sudah < p.harap)
  return (
    <>
      {[1, 2, 3, 4].map((s) => (
        <section key={s} className="kartu">
          <div className="eyebrow">Segmen {s}</div>
          <h3 className="judul-bagian">{SEGMEN[s]}</h3>
          <table>
            <thead><tr><th>#</th><th>Kelompok</th><th className="n">Skor</th><th className="n">Suara</th><th className="n">Terbaik</th></tr></thead>
            <tbody>
              {rekap.tahap1.filter((r) => r.segmen === s).map((r) => (
                <tr key={r.nomor} className={r.peringkat === 1 && r.n_suara > 0 ? 'unggul' : ''}>
                  <td>{r.peringkat}</td>
                  <td><b>K{r.nomor}</b> <span className="redup">{r.materi}</span></td>
                  <td className="n"><b>{fmt(r.rata)}</b></td>
                  <td className="n">{r.n_suara}/{r.n_harap}</td>
                  <td className="n">{r.terbaik}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      ))}
      <div className={`pita ${belum1.length ? 'kuning' : 'hijau'}`}>
        {belum1.length === 0 ? 'Semua penilai Tahap 1 sudah lengkap.'
          : <>Belum lengkap: {belum1.map((p) => `${p.kode} (${p.sudah}/${p.harap})`).join(', ')}</>}
      </div>

      <section className="kartu">
        <div className="eyebrow">Babak Final</div>
        <h3 className="judul-bagian">4 Besar</h3>
        {rekap.final.length === 0 ? <p className="keterangan">Finalis belum diumumkan.</p> : (
          <>
            <table>
              <thead><tr><th>#</th><th>Kelompok</th><th className="n">Kel.</th><th className="n">Juri</th><th className="n">Total</th></tr></thead>
              <tbody>
                {rekap.final.map((r) => (
                  <tr key={r.nomor} className={r.peringkat === 1 && r.kel_n > 0 ? 'unggul' : ''}>
                    <td>{r.peringkat}</td>
                    <td><b>K{r.nomor}</b> <span className="redup">{r.materi}</span></td>
                    <td className="n">{fmt(r.kel_rata)}<div className="redup">{r.kel_n} kel.</div></td>
                    <td className="n">{fmt(r.juri_rata)}<div className="redup">{r.juri_n} juri</div></td>
                    <td className="n"><b>{fmt(r.total)}</b></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="keterangan" style={{ marginTop: 12 }}>
              Total = 60% kelompok (nilai tertinggi dan terendah dibuang) + 40% rata-rata {st.juri_aktif} juri.
            </p>
            {belumF.length > 0 && <div className="pita kuning">Belum lengkap: {belumF.map((p) => `${p.kode} (${p.sudah}/${p.harap})`).join(', ')}</div>}
          </>
        )}
      </section>
    </>
  )
}

function Akses({ akses }) {
  const [cari, setCari] = useState('')
  const [salin, setSalin] = useState('')
  if (!akses) return <div className="memuat">Memuat…</div>
  const alamat = window.location.href.split('#')[0].split('?')[0]
  const teks = (x) => {
    const ket = x.peran === 'kelompok' ? `Kelompok ${x.kelompok} (${x.segmen_nama})`
      : x.peran === 'zona' ? `Pembina Zona ${x.segmen} (${x.segmen_nama})` : x.nama
    return `Teach Back Day · ${ket}\nKode: ${x.kode}\nPIN: ${x.pin}\nBuka: ${alamat}`
  }
  async function salinTeks(t, tanda) {
    try { await navigator.clipboard.writeText(t) }
    catch {
      const el = document.createElement('textarea'); el.value = t; document.body.appendChild(el); el.select()
      try { document.execCommand('copy') } catch { /* abaikan */ }
      document.body.removeChild(el)
    }
    setSalin(tanda); setTimeout(() => setSalin(''), 1800)
  }
  const q = cari.trim().toLowerCase()
  const daftar = akses.filter((x) => !q || `${x.kode} ${x.nama} ${x.materi || ''} ${x.segmen_nama || ''}`.toLowerCase().includes(q))
  return (
    <>
      <input className="cari" placeholder="Cari kode, kelompok, atau materi" value={cari} onChange={(e) => setCari(e.target.value)} />
      <button className="tombol sekunder penuh" style={{ marginBottom: 14 }}
              onClick={() => salinTeks(akses.filter((x) => x.peran !== 'admin').map(teks).join('\n\n'), 'semua')}>
        {salin === 'semua' ? 'Tersalin' : 'Salin semua kode & PIN'}
      </button>
      <div className="kartu tanpa-pad">
        {daftar.map((x) => (
          <div className="baris-akses" key={x.kode}>
            <div className="isi">
              <div><b>{x.kode}</b> <span className="lencana">{NAMA_PERAN[x.peran]}</span></div>
              <small>{x.peran === 'kelompok' ? x.materi : x.nama}</small>
            </div>
            <span className="pin">{x.pin}</span>
            <button className="tombol kecil sekunder" onClick={() => salinTeks(teks(x), x.kode)}>{salin === x.kode ? '✓' : 'Salin'}</button>
          </div>
        ))}
      </div>
    </>
  )
}

/* ------------------------------------------------------------------ */
/* layar utama final: batang skor live untuk proyektor                  */
/* ------------------------------------------------------------------ */
function useTween(target, ms = 900) {
  const [v, setV] = useState(target || 0)
  const ref = useRef(target || 0)
  useEffect(() => {
    const dari = ref.current, ke = target || 0, t0 = performance.now()
    let raf
    const langkah = (now) => {
      const p = Math.min(1, (now - t0) / ms)
      const x = dari + (ke - dari) * (1 - Math.pow(1 - p, 3))
      ref.current = x; setV(x)
      if (p < 1) raf = requestAnimationFrame(langkah)
    }
    raf = requestAnimationFrame(langkah)
    return () => cancelAnimationFrame(raf)
  }, [target, ms])
  return v
}

function Kolom({ r, pimpin, harapKel, juri }) {
  const total = r.total ?? 0
  const v = useTween(total)
  const tinggi = Math.max(2, (v / 5) * 100)
  const [kedip, setKedip] = useState(false)
  const lalu = useRef(r.kel_n + r.juri_n)
  useEffect(() => {
    const n = r.kel_n + r.juri_n
    if (n !== lalu.current) { lalu.current = n; setKedip(true); const t = setTimeout(() => setKedip(false), 700); return () => clearTimeout(t) }
  }, [r.kel_n, r.juri_n])
  return (
    <div className={`ly-kolom ${pimpin ? 'pimpin' : ''} ${kedip ? 'kedip' : ''}`}>
      <div className="ly-skor">{r.total == null ? '–' : v.toFixed(2).replace('.', ',')}</div>
      <div className="ly-wadah">
        <div className="ly-batang" style={{ height: `${tinggi}%` }}>
          {pimpin && <span className="ly-mahkota">Teratas</span>}
        </div>
      </div>
      <div className="ly-label">
        <div className="ly-no">Kelompok {r.nomor}</div>
        <div className="ly-materi">{r.materi}</div>
        <div className="ly-suara">
          <span>{r.kel_n}/{harapKel} kelompok</span>
          <span>{r.juri_n}/{juri} juri</span>
        </div>
      </div>
    </div>
  )
}

function Layar({ st, sesi, onTutup }) {
  const [rk, setRk] = useState(null)
  const [sim, setSim] = useState(false)
  const args = { p_kode: sesi.kode, p_pin: sesi.pin }

  const muat = useCallback(async () => {
    try { setRk(await rpc('tb_admin_rekap', { p_kode: sesi.kode, p_pin: sesi.pin })) } catch { /* coba lagi */ }
  }, [sesi])

  useEffect(() => { muat(); const t = setInterval(muat, 2000); return () => clearInterval(t) }, [muat])

  useEffect(() => {
    if (!sim) return
    const t = setInterval(async () => { try { await rpc('tb_demo_satu', args); await muat() } catch { setSim(false) } }, 900)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sim])

  useEffect(() => {
    const el = document.documentElement
    if (el.requestFullscreen) el.requestFullscreen().catch(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen().catch(() => {}) }
  }, [])

  const urutan = st.finalis_nos || []
  const baris = (rk?.final || []).slice().sort((a, b) => urutan.indexOf(a.nomor) - urutan.indexOf(b.nomor))
  const adaNilai = baris.filter((r) => r.total != null)
  const tertinggi = adaNilai.length ? Math.max(...adaNilai.map((r) => r.total)) : null
  const jmlKel = (rk?.progres_final || []).filter((p) => p.peran === 'kelompok').length
  const harapKel = Math.max(0, jmlKel - 1)
  const masuk = baris.reduce((s, r) => s + r.kel_n + r.juri_n, 0)
  const harapTotal = baris.length * (harapKel + st.juri_aktif)

  return (
    <div className="layar">
      <div className="ly-kepala">
        <div className="ly-merek">
          <img src="./logo-nlo.png" alt="" />
          <div>
            <div className="ly-eyebrow">Teach Back Day · Babak Final</div>
            <div className="ly-judul">Perolehan Nilai 4 Besar</div>
          </div>
        </div>
        <div className="ly-live"><span className="ly-titik" />LIVE</div>
      </div>

      <div className="ly-grafik">
        <div className="ly-sumbu">{[5, 4, 3, 2, 1].map((n) => <span key={n} style={{ bottom: `${(n / 5) * 100}%` }}>{n}</span>)}</div>
        <div className="ly-kolom-wadah">
          {baris.map((r) => (
            <Kolom key={r.nomor} r={r} harapKel={harapKel} juri={st.juri_aktif}
                   pimpin={tertinggi != null && r.total === tertinggi} />
          ))}
        </div>
      </div>

      <div className="ly-kaki">
        <div className="ly-progres">
          <div className="ly-progres-bar"><span style={{ width: `${harapTotal ? (masuk / harapTotal) * 100 : 0}%` }} /></div>
          <span>{masuk} dari {harapTotal} penilaian masuk</span>
        </div>
        <div className="ly-rumus">Skor = 60% nilai kelompok + 40% nilai juri</div>
        <div className="ly-aksi">
          {DEMO && <button onClick={() => setSim((s) => !s)}>{sim ? 'Hentikan simulasi' : 'Simulasi nilai masuk'}</button>}
          <button onClick={onTutup}>Tutup layar</button>
        </div>
      </div>
    </div>
  )
}
