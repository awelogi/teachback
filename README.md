# Teach Back Day

Aplikasi penilaian Teach Back Day (17 kelompok → 4 segmen → 4 finalis), dipakai lewat HP peserta.

## Aturan penilaian
- **Tahap 1** (4 segmen paralel): satu nilai per kelompok untuk 3 aspek (Isi & Relevansi, Praktik & Demonstrasi, Penyampaian & Kerja Tim), skala 1 / 3 / 5 (kurang / cukup / sangat baik), bobot sama. Penilai = kelompok lain di segmen yang sama + pembina zona (satu suara tambahan). Skor = rata-rata biasa. Seri dipecah oleh suara "kelompok terbaik". Peserta hanya melihat 4 finalis.
- **Final**: 3 aspek yang sama + Tanya Jawab (bobot sama). Satu nilai per kelompok dari kelompok lain (nilai tertinggi dan terendah dibuang) = 60%, rata-rata juri aktif (2 atau 3, diatur admin) = 40%.
- Kelompok tidak bisa menilai dirinya sendiri; nilai bisa diubah sampai segmen/final ditutup admin.

## Pasang (sekali saja)
1. **Supabase**: buka SQL Editor, tempel isi `supabase/teachback.sql`, Run. Hasil akhirnya daftar kode dan PIN. Semua tabel berawalan `tb_`, jadi aman dipakai di proyek Supabase yang sudah ada. Aman dijalankan ulang (PIN tidak berubah).
2. Salin `.env.example` menjadi `.env`, isi URL dan anon key dari Supabase → Project Settings → API.
3. `npm install` lalu `npm run dev` untuk coba lokal, atau `npm run build`.
4. **GitHub Pages**: push ke repo, tambahkan secret `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` (Settings → Secrets and variables → Actions), lalu Settings → Pages → Source: GitHub Actions. Workflow ada di `.github/workflows/deploy.yml`.

## Hari H
- Masuk sebagai **ADMIN** → tab *Kode & PIN* untuk membagikan kode ke tiap kelompok, 4 pembina zona (Z1–Z4), dan juri (J1–J3).
- Tab *Kontrol*: tutup tiap segmen setelah semua selesai → pilih dan umumkan 4 finalis → pindah fase ke Final → atur jumlah juri → tutup final → tampilkan hasil.
- Tab *Rekap*: skor, jumlah suara masuk, dan siapa yang belum lengkap menilai.
- Latihan dulu, lalu **Reset data latihan** sebelum acara.

Catatan keamanan: ini aplikasi acara sehari. PIN disimpan apa adanya dan tabel hanya bisa diakses lewat fungsi database; jangan dipakai untuk data sensitif.
