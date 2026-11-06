// Mode demo: meniru fungsi database di memori browser (disimpan di localStorage),
// supaya aplikasi bisa dicoba tanpa Supabase. Aturan skornya sama dengan teachback.sql.
const KEL = [
  [9, 'Panduan Lari yang Baik dan Benar (Running Skill)', 1, 1],
  [5, 'Teknik Peregangan & Ice Breaking (Line Dance)', 1, 2],
  [6, 'Peregangan di Tempat Kerja', 1, 3],
  [7, 'Teknik Dasar Olahraga Bola Basket', 1, 4],
  [8, 'Memulai Lari Enak, Fun & Mindful untuk Semua Kalangan', 1, 5],
  [2, 'Teknik REHAT (Relaksasi Emosi, Hati Aman dan Tentram)', 2, 1],
  [14, 'Kesehatan dan Keselamatan Kerja', 2, 2],
  [15, 'Self-Hypnosis', 2, 3],
  [17, 'Memahami Lebih Dalam tentang Bullying', 2, 4],
  [4, 'Pengenalan Huruf Bahasa Isyarat', 3, 1],
  [11, 'Skill Menggambar Karikatur/Anime', 3, 2],
  [13, 'Memahami Seseorang dari Body Language', 3, 3],
  [16, 'Teori Komposisi Fotografi', 3, 4],
  [1, 'Pembuatan Aplikasi Semudah Chatting', 4, 1],
  [3, 'Pemanfaatan AI untuk Inovasi', 4, 2],
  [10, 'Professional Look, Positive Impact', 4, 3],
  [12, 'Pedoman Tata Naskah Dinas', 4, 4],
].map(([nomor, materi, segmen, urut]) => ({ nomor, materi, segmen, urut }))

const SEG = { 1: 'Sport & Physical Wellness', 2: 'Personal Wellness & Safety', 3: 'Communication & Creative Skills', 4: 'Digital & Professional Skills' }
const KEY = 'tb_demo_v1'

function baru() {
  const akses = [{ kode: 'ADMIN', peran: 'admin', nama: 'Admin', kelompok: null, segmen: null, pin: '0000' }]
  for (let g = 1; g <= 3; g++) akses.push({ kode: `J${g}`, peran: 'juri', nama: `Juri ${g}`, kelompok: null, segmen: null, pin: '1234' })
  for (let s = 1; s <= 4; s++) akses.push({ kode: `Z${s}`, peran: 'zona', nama: `Pembina Zona ${s}`, kelompok: null, segmen: s, pin: '1234' })
  for (const k of [...KEL].sort((a, b) => a.nomor - b.nomor)) {
    akses.push({ kode: `K${String(k.nomor).padStart(2, '0')}`, peran: 'kelompok', nama: `Kelompok ${k.nomor}`, kelompok: k.nomor, segmen: k.segmen, pin: '1234' })
  }
  return { akses, nilai: [], suara: [], s: { fase: 'tahap1', segmen_tutup: [], final_tutup: false, juri_aktif: 3, finalis: [], hasil_tampil: 0 } }
}
function muat() {
  try { const t = localStorage.getItem(KEY); if (t) return JSON.parse(t) } catch { /* abaikan */ }
  return baru()
}
function simpanDb(db) { try { localStorage.setItem(KEY, JSON.stringify(db)) } catch { /* abaikan */ } }

const gagal = (m) => { throw new Error(m) }
const kel = (n) => KEL.find((k) => k.nomor === n)
const juriNo = (a) => parseInt(a.kode.slice(1), 10)

function auth(db, kode, pin) {
  const a = db.akses.find((x) => x.kode === String(kode || '').trim().toUpperCase() && x.pin === String(pin || '').trim())
  return a || gagal('Kode atau PIN salah')
}
const juriAktif = (db, a) => a.peran === 'juri' && juriNo(a) <= db.s.juri_aktif
function targetNos(db, a) {
  const s = db.s
  const urut = (l) => l.sort((x, y) => x.urut - y.urut).map((k) => k.nomor)
  if (s.fase === 'tahap1') {
    if (a.peran === 'kelompok') return urut(KEL.filter((k) => k.segmen === a.segmen && k.nomor !== a.kelompok))
    if (a.peran === 'zona') return urut(KEL.filter((k) => k.segmen === a.segmen))
  } else if (s.fase === 'final') {
    if (a.peran === 'kelompok') return s.finalis.filter((x) => x !== a.kelompok)
    if (a.peran === 'juri' && juriAktif(db, a)) return [...s.finalis]
  }
  return []
}
function terkunci(db, a) {
  const s = db.s
  if (s.fase === 'tahap1') return a.segmen != null && s.segmen_tutup.includes(a.segmen)
  if (s.fase === 'final') return s.final_tutup
  return true
}
const rata = (l) => (l.length ? l.reduce((x, y) => x + y, 0) / l.length : null)
const r3 = (x) => (x == null ? null : Math.round(x * 1000) / 1000)

function peringkat(rows, cmp) {
  return rows.map((r) => ({ ...r, peringkat: 1 + rows.filter((x) => cmp(x, r) < 0).length }))
}
const lebih = (a, b) => (a == null && b == null ? 0 : a == null ? 1 : b == null ? -1 : b - a) // nilai besar = lebih baik

function skorTahap1(db) {
  const rows = KEL.map((k) => {
    const v = db.nilai.filter((n) => n.fase === 'tahap1' && n.dinilai === k.nomor).map((n) => (n.isi + n.praktik + n.penyampaian) / 3)
    return {
      nomor: k.nomor, segmen: k.segmen, materi: k.materi, rata: r3(rata(v)), n_suara: v.length,
      n_harap: KEL.filter((x) => x.segmen === k.segmen).length, terbaik: db.suara.filter((s) => s.untuk === k.nomor).length,
    }
  })
  return peringkat(rows, (a, b) => (a.segmen !== b.segmen ? 1 : lebih(a.rata, b.rata) || b.terbaik - a.terbaik))
}

function skorFinal(db) {
  const s = db.s
  const rows = s.finalis.map((no) => {
    const k = kel(no)
    const v = db.nilai.filter((n) => n.fase === 'final' && n.dinilai === no).map((n) => {
      const a = db.akses.find((x) => x.kode === n.penilai)
      return { peran: a.peran, kode: a.kode, sk: (n.isi + n.praktik + n.penyampaian + n.tanya_jawab) / 4 }
    })
    const kv = v.filter((x) => x.peran === 'kelompok').map((x) => x.sk).sort((x, y) => x - y)
    const dipakai = kv.length < 5 ? kv : kv.slice(1, -1)
    const jv = v.filter((x) => x.peran === 'juri' && juriNo(x) <= s.juri_aktif).map((x) => x.sk)
    const ka = rata(dipakai), ja = rata(jv)
    const tot = ka == null ? null : ja == null ? ka : 0.6 * ka + 0.4 * ja
    return { nomor: no, materi: k.materi, segmen: k.segmen, kel_rata: r3(ka), kel_n: kv.length, juri_rata: r3(ja), juri_n: jv.length, total: r3(tot) }
  })
  return peringkat(rows, (a, b) => lebih(a.total, b.total))
}

const aspekFase = (f) => (f === 'final' ? ['isi', 'praktik', 'penyampaian', 'tanya_jawab'] : ['isi', 'praktik', 'penyampaian'])

function status(db, a) {
  const s = db.s
  const nos = targetNos(db, a)
  const fin = s.finalis.length ? [...s.finalis].map(kel).sort((x, y) => x.segmen - y.segmen)
    .map((k) => ({ nomor: k.nomor, materi: k.materi, segmen: k.segmen, segmen_nama: SEG[k.segmen] })) : null
  return {
    akses: { kode: a.kode, peran: a.peran, nama: a.nama, kelompok: a.kelompok, segmen: a.segmen,
             materi: a.kelompok ? kel(a.kelompok).materi : null, segmen_nama: a.segmen ? SEG[a.segmen] : null },
    fase: s.fase, terkunci: terkunci(db, a), aktif: a.peran !== 'juri' || juriAktif(db, a),
    juri_aktif: s.juri_aktif, final_tutup: s.final_tutup, segmen_tutup: s.segmen_tutup, finalis_nos: s.finalis,
    hasil_tampil: s.hasil_tampil, aspek: aspekFase(s.fase),
    targets: nos.map((no) => {
      const k = kel(no)
      const n = db.nilai.find((x) => x.fase === s.fase && x.penilai === a.kode && x.dinilai === no)
      return { nomor: no, materi: k.materi, segmen: k.segmen,
               nilai: n ? { isi: n.isi, praktik: n.praktik, penyampaian: n.penyampaian, tanya_jawab: n.tanya_jawab ?? null } : null }
    }),
    suara: (db.suara.find((x) => x.penilai === a.kode) || {}).untuk ?? null,
    finalis: fin,
    hasil: s.hasil_tampil > 0 ? skorFinal(db).filter((h) => h.peringkat <= s.hasil_tampil)
      .sort((x, y) => x.peringkat - y.peringkat || x.nomor - y.nomor).map((h) => ({ nomor: h.nomor, materi: h.materi, peringkat: h.peringkat })) : null,
  }
}

function rekap(db) {
  const s = db.s
  const nfin = s.finalis.length
  const urut = (x, y) => (x.segmen ?? 0) - (y.segmen ?? 0)
  return {
    tahap1: skorTahap1(db).sort((x, y) => x.segmen - y.segmen || x.peringkat - y.peringkat || x.nomor - y.nomor),
    final: skorFinal(db).sort((x, y) => x.peringkat - y.peringkat || x.nomor - y.nomor),
    progres_tahap1: db.akses.filter((x) => x.peran === 'kelompok' || x.peran === 'zona').sort(urut).map((x) => ({
      kode: x.kode, nama: x.nama, peran: x.peran, segmen: x.segmen,
      sudah: db.nilai.filter((n) => n.fase === 'tahap1' && n.penilai === x.kode).length,
      harap: KEL.filter((k) => k.segmen === x.segmen).length - (x.peran === 'kelompok' ? 1 : 0),
      suara: db.suara.some((u) => u.penilai === x.kode),
    })),
    progres_final: db.akses.filter((x) => x.peran === 'kelompok' || (x.peran === 'juri' && juriNo(x) <= s.juri_aktif)).map((x) => ({
      kode: x.kode, nama: x.nama, peran: x.peran,
      sudah: db.nilai.filter((n) => n.fase === 'final' && n.penilai === x.kode).length,
      harap: nfin - (x.peran === 'kelompok' && s.finalis.includes(x.kelompok) ? 1 : 0),
    })),
  }
}

// isi nilai acak untuk semua penilai pada fase berjalan (khusus demo)
function isiContoh(db) {
  const pilih = (peluang5) => { const r = Math.random(); return r < peluang5 ? 5 : r < peluang5 + 0.4 ? 3 : 1 }
  const s = db.s
  for (const a of db.akses) {
    if (a.peran === 'admin') continue
    for (const no of targetNos(db, a)) {
      const peluang5 = [0.75, 0.5, 0.3][(no * 7) % 3] // beberapa kelompok sedikit lebih unggul
      const f = () => pilih(peluang5)
      const baris = { fase: s.fase, penilai: a.kode, dinilai: no, isi: f(), praktik: f(), penyampaian: f(), tanya_jawab: s.fase === 'final' ? f() : null }
      const i = db.nilai.findIndex((x) => x.fase === s.fase && x.penilai === a.kode && x.dinilai === no)
      if (i >= 0) db.nilai[i] = baris; else db.nilai.push(baris)
    }
    if (s.fase === 'tahap1' && a.peran === 'kelompok') {
      const t = targetNos(db, a)
      const untuk = t[Math.floor(Math.random() * t.length)]
      db.suara = db.suara.filter((x) => x.penilai !== a.kode); db.suara.push({ penilai: a.kode, untuk })
    }
  }
}

const aksi = {
  tb_masuk(db, p) { const a = auth(db, p.p_kode, p.p_pin); return { kode: a.kode, peran: a.peran, nama: a.nama } },
  tb_status(db, p) { return status(db, auth(db, p.p_kode, p.p_pin)) },
  tb_nilai_simpan(db, p) {
    const a = auth(db, p.p_kode, p.p_pin)
    if (!targetNos(db, a).includes(p.p_dinilai)) gagal('Kelompok ini tidak bisa kamu nilai sekarang')
    if (terkunci(db, a)) gagal('Penilaian sudah ditutup')
    const f = db.s.fase
    if (f === 'final' && p.p_tanya_jawab == null) gagal('Nilai Tanya Jawab belum diisi')
    const baris = { fase: f, penilai: a.kode, dinilai: p.p_dinilai, isi: p.p_isi, praktik: p.p_praktik, penyampaian: p.p_penyampaian, tanya_jawab: f === 'final' ? p.p_tanya_jawab : null }
    const i = db.nilai.findIndex((x) => x.fase === f && x.penilai === a.kode && x.dinilai === p.p_dinilai)
    if (i >= 0) db.nilai[i] = baris; else db.nilai.push(baris)
    return null
  },
  tb_suara_simpan(db, p) {
    const a = auth(db, p.p_kode, p.p_pin)
    if (a.peran !== 'kelompok' || db.s.fase !== 'tahap1') gagal('Suara terbaik hanya untuk kelompok di Tahap 1')
    if (!targetNos(db, a).includes(p.p_untuk)) gagal('Pilih kelompok lain di segmenmu')
    if (terkunci(db, a)) gagal('Penilaian sudah ditutup')
    db.suara = db.suara.filter((x) => x.penilai !== a.kode); db.suara.push({ penilai: a.kode, untuk: p.p_untuk })
    return null
  },
  tb_admin_rekap(db, p) { if (auth(db, p.p_kode, p.p_pin).peran !== 'admin') gagal('Khusus admin'); return rekap(db) },
  tb_admin_ubah(db, p) {
    if (auth(db, p.p_kode, p.p_pin).peran !== 'admin') gagal('Khusus admin')
    Object.assign(db.s, p.p_patch)
    return null
  },
  tb_admin_akses(db, p) {
    if (auth(db, p.p_kode, p.p_pin).peran !== 'admin') gagal('Khusus admin')
    const bobot = { admin: 0, juri: 1, zona: 2, kelompok: 3 }
    return [...db.akses].sort((x, y) => bobot[x.peran] - bobot[y.peran] || (x.segmen ?? 0) - (y.segmen ?? 0) || x.kode.localeCompare(y.kode))
      .map((x) => ({ ...x, segmen_nama: x.segmen ? SEG[x.segmen] : null, materi: x.kelompok ? kel(x.kelompok).materi : null }))
  },
  tb_admin_reset(db, p) {
    if (auth(db, p.p_kode, p.p_pin).peran !== 'admin') gagal('Khusus admin')
    db.nilai = []; db.suara = []
    Object.assign(db.s, { fase: 'tahap1', segmen_tutup: [], final_tutup: false, finalis: [], hasil_tampil: 0 })
    return null
  },
  tb_demo_satu(db, p) {
    if (auth(db, p.p_kode, p.p_pin).peran !== 'admin') gagal('Khusus admin')
    if (db.s.fase !== 'final') gagal('Bukan fase final')
    const kosong = []
    for (const a of db.akses) {
      if (a.peran !== 'kelompok' && a.peran !== 'juri') continue
      for (const no of targetNos(db, a)) {
        if (!db.nilai.some((x) => x.fase === 'final' && x.penilai === a.kode && x.dinilai === no)) kosong.push([a.kode, no])
      }
    }
    if (!kosong.length) gagal('Semua nilai sudah masuk')
    const [kode, no] = kosong[Math.floor(Math.random() * kosong.length)]
    const peluang5 = [0.75, 0.5, 0.3][(no * 7) % 3]
    const f = () => { const r = Math.random(); return r < peluang5 ? 5 : r < peluang5 + 0.4 ? 3 : 1 }
    db.nilai.push({ fase: 'final', penilai: kode, dinilai: no, isi: f(), praktik: f(), penyampaian: f(), tanya_jawab: f() })
    return null
  },
  tb_demo_isi(db, p) { if (auth(db, p.p_kode, p.p_pin).peran !== 'admin') gagal('Khusus admin'); isiContoh(db); return null },
}

export async function rpcDemo(fungsi, args) {
  const db = muat()
  const f = aksi[fungsi]
  if (!f) throw new Error('Fungsi tidak dikenal')
  const hasil = f(db, args)
  simpanDb(db)
  return hasil === undefined ? null : JSON.parse(JSON.stringify(hasil))
}
