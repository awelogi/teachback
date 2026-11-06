-- =====================================================================
-- Teach Back Day · skema database (Supabase)
-- Semua objek berawalan tb_ sehingga aman dijalankan di proyek Supabase
-- yang sudah dipakai aplikasi lain. Aman dijalankan ulang: PIN, nilai, dan
-- pengaturan yang sudah ada tidak ditimpa.
-- Jalankan di Supabase → SQL Editor → New query → Run.
-- =====================================================================

-- ---------- tabel ----------
create table if not exists tb_segmen (
  nomor int primary key,
  nama  text not null
);

create table if not exists tb_kelompok (
  nomor  int primary key,
  materi text not null,
  segmen int not null references tb_segmen(nomor),
  urut   int not null
);

create table if not exists tb_akses (
  kode     text primary key,
  peran    text not null check (peran in ('kelompok','zona','juri','admin')),
  nama     text not null,
  kelompok int references tb_kelompok(nomor),
  segmen   int references tb_segmen(nomor),
  pin      text not null
);

create table if not exists tb_setting (
  id           int primary key default 1 check (id = 1),
  fase         text    not null default 'tahap1' check (fase in ('tahap1','final','selesai')),
  segmen_tutup int[]   not null default '{}',
  final_tutup  boolean not null default false,
  juri_aktif   int     not null default 3 check (juri_aktif in (2,3)),
  finalis      int[]   not null default '{}',
  hasil_tampil int     not null default 0 check (hasil_tampil between 0 and 4)
);

create table if not exists tb_nilai (
  fase        text not null check (fase in ('tahap1','final')),
  penilai     text not null references tb_akses(kode) on delete cascade,
  dinilai     int  not null references tb_kelompok(nomor),
  isi         int  not null check (isi in (1, 3, 5)),
  praktik     int  not null check (praktik in (1, 3, 5)),
  penyampaian int  not null check (penyampaian in (1, 3, 5)),
  tanya_jawab int  check (tanya_jawab in (1, 3, 5)),
  diubah      timestamptz not null default now(),
  primary key (fase, penilai, dinilai)
);

create table if not exists tb_suara (
  penilai text primary key references tb_akses(kode) on delete cascade,
  untuk   int  not null references tb_kelompok(nomor),
  diubah  timestamptz not null default now()
);

-- tidak ada akses langsung dari browser: semua lewat fungsi di bawah
alter table tb_segmen   enable row level security;
alter table tb_kelompok enable row level security;
alter table tb_akses    enable row level security;
alter table tb_setting  enable row level security;
alter table tb_nilai    enable row level security;
alter table tb_suara    enable row level security;
do $$ begin
  begin
    execute 'revoke all on tb_segmen, tb_kelompok, tb_akses, tb_setting, tb_nilai, tb_suara from anon, authenticated';
  exception when undefined_object then null;
  end;
end $$;

-- ---------- data awal (sesuai infografis) ----------
insert into tb_segmen(nomor, nama) values
  (1, 'Sport & Physical Wellness'),
  (2, 'Personal Wellness & Safety'),
  (3, 'Communication & Creative Skills'),
  (4, 'Digital & Professional Skills')
on conflict (nomor) do update set nama = excluded.nama;

insert into tb_kelompok(nomor, materi, segmen, urut) values
  (9,  'Panduan Lari yang Baik dan Benar (Running Skill)', 1, 1),
  (5,  'Teknik Peregangan & Ice Breaking (Line Dance)', 1, 2),
  (6,  'Peregangan di Tempat Kerja', 1, 3),
  (7,  'Teknik Dasar Olahraga Bola Basket', 1, 4),
  (8,  'Memulai Lari Enak, Fun & Mindful untuk Semua Kalangan', 1, 5),
  (2,  'Teknik REHAT (Relaksasi Emosi, Hati Aman dan Tentram)', 2, 1),
  (14, 'Kesehatan dan Keselamatan Kerja', 2, 2),
  (15, 'Self-Hypnosis', 2, 3),
  (17, 'Memahami Lebih Dalam tentang Bullying', 2, 4),
  (4,  'Pengenalan Huruf Bahasa Isyarat', 3, 1),
  (11, 'Skill Menggambar Karikatur/Anime', 3, 2),
  (13, 'Memahami Seseorang dari Body Language', 3, 3),
  (16, 'Teori Komposisi Fotografi', 3, 4),
  (1,  'Pembuatan Aplikasi Semudah Chatting', 4, 1),
  (3,  'Pemanfaatan AI untuk Inovasi', 4, 2),
  (10, 'Professional Look, Positive Impact', 4, 3),
  (12, 'Pedoman Tata Naskah Dinas', 4, 4)
on conflict (nomor) do update set materi = excluded.materi, segmen = excluded.segmen, urut = excluded.urut;

insert into tb_setting(id) values (1) on conflict (id) do nothing;

-- kode & PIN (PIN diacak sekali; dijalankan ulang tidak mengubah PIN yang ada)
insert into tb_akses(kode, peran, nama, kelompok, segmen, pin)
select 'K' || lpad(k.nomor::text, 2, '0'), 'kelompok', 'Kelompok ' || k.nomor, k.nomor, k.segmen,
       lpad((floor(random() * 10000))::int::text, 4, '0')
from tb_kelompok k
on conflict (kode) do nothing;

insert into tb_akses(kode, peran, nama, kelompok, segmen, pin)
select 'Z' || s.nomor, 'zona', 'Pembina Zona ' || s.nomor, null, s.nomor,
       lpad((floor(random() * 10000))::int::text, 4, '0')
from tb_segmen s
on conflict (kode) do nothing;

insert into tb_akses(kode, peran, nama, kelompok, segmen, pin)
select 'J' || g, 'juri', 'Juri ' || g, null, null, lpad((floor(random() * 10000))::int::text, 4, '0')
from generate_series(1, 3) g
on conflict (kode) do nothing;

insert into tb_akses(kode, peran, nama, kelompok, segmen, pin)
values ('ADMIN', 'admin', 'Admin', null, null, lpad((floor(random() * 1000000))::int::text, 6, '0'))
on conflict (kode) do nothing;

-- ---------- fungsi internal ----------
create or replace function tb_auth(p_kode text, p_pin text) returns tb_akses
language plpgsql stable security definer set search_path = public as $$
declare a tb_akses;
begin
  select * into a from tb_akses where kode = upper(btrim(coalesce(p_kode, ''))) and pin = btrim(coalesce(p_pin, ''));
  if not found then raise exception 'Kode atau PIN salah'; end if;
  return a;
end $$;

-- juri yang sedang aktif (J1..Jn sesuai pengaturan)
create or replace function tb_juri_aktif(a tb_akses) returns boolean
language sql stable security definer set search_path = public as $$
  select a.peran = 'juri' and substring(a.kode from 2)::int <= (select juri_aktif from tb_setting where id = 1)
$$;

-- daftar nomor kelompok yang boleh dinilai oleh akun ini pada fase sekarang
create or replace function tb_target_nos(a tb_akses) returns int[]
language plpgsql stable security definer set search_path = public as $$
declare s tb_setting; r int[] := '{}';
begin
  select * into s from tb_setting where id = 1;
  if s.fase = 'tahap1' then
    if a.peran = 'kelompok' then
      select coalesce(array_agg(nomor order by urut), '{}') into r from tb_kelompok where segmen = a.segmen and nomor <> a.kelompok;
    elsif a.peran = 'zona' then
      select coalesce(array_agg(nomor order by urut), '{}') into r from tb_kelompok where segmen = a.segmen;
    end if;
  elsif s.fase = 'final' then
    if a.peran = 'kelompok' then
      r := array(select x from unnest(s.finalis) with ordinality t(x, i) where x <> a.kelompok order by i);
    elsif a.peran = 'juri' and tb_juri_aktif(a) then
      r := s.finalis;
    end if;
  end if;
  return r;
end $$;

create or replace function tb_terkunci(a tb_akses) returns boolean
language plpgsql stable security definer set search_path = public as $$
declare s tb_setting;
begin
  select * into s from tb_setting where id = 1;
  if s.fase = 'tahap1' then return a.segmen is not null and a.segmen = any(s.segmen_tutup); end if;
  if s.fase = 'final'  then return s.final_tutup; end if;
  return true;
end $$;

-- ---------- rumus skor ----------
-- Tahap 1: rata-rata nilai dari kelompok lain di segmen + pembina zona (tiap penilai = 1 suara)
create or replace function tb_skor_tahap1() returns table(
  nomor int, segmen int, materi text, rata numeric, n_suara int, n_harap int, terbaik int, peringkat int)
language sql stable security definer set search_path = public as $$
  with v as (
    select dinilai, (isi + praktik + penyampaian) / 3.0 as sk from tb_nilai where fase = 'tahap1'
  ), a as (
    select k.nomor, k.segmen, k.materi,
      (select avg(sk) from v where v.dinilai = k.nomor) as rata,
      (select count(*) from v where v.dinilai = k.nomor)::int as n_suara,
      (select count(*) from tb_kelompok x where x.segmen = k.segmen)::int as n_harap,
      (select count(*) from tb_suara s where s.untuk = k.nomor)::int as terbaik
    from tb_kelompok k
  )
  select nomor, segmen, materi, round(rata, 3), n_suara, n_harap, terbaik,
         (rank() over (partition by segmen order by rata desc nulls last, terbaik desc))::int
  from a
$$;

-- Final: 60% rata-rata nilai kelompok (satu nilai tertinggi dan terendah dibuang) + 40% rata-rata juri aktif
create or replace function tb_final_skor() returns table(
  nomor int, materi text, segmen int, kel_rata numeric, kel_n int, juri_rata numeric, juri_n int, total numeric, peringkat int)
language sql stable security definer set search_path = public as $$
  with s as (select * from tb_setting where id = 1),
  v as (
    select n.dinilai, ak.peran, ak.kode,
           (n.isi + n.praktik + n.penyampaian + n.tanya_jawab) / 4.0 as sk
    from tb_nilai n join tb_akses ak on ak.kode = n.penilai
    where n.fase = 'final' and n.dinilai in (select unnest(finalis) from s)
  ),
  kv as (
    select dinilai, sk,
           row_number() over (partition by dinilai order by sk)      as ra,
           row_number() over (partition by dinilai order by sk desc) as rd,
           count(*)     over (partition by dinilai)                  as c
    from v where peran = 'kelompok'
  ),
  kel as (
    select dinilai, avg(sk) as a, max(c)::int as n
    from kv where c < 5 or (ra > 1 and rd > 1) group by dinilai
  ),
  jv as (
    select dinilai, avg(sk) as a, count(*)::int as n
    from v
    where peran = 'juri' and substring(kode from 2)::int <= (select juri_aktif from s)
    group by dinilai
  ),
  t as (
    select k.nomor, k.materi, k.segmen, kel.a as ka, coalesce(kel.n, 0) as kn, jv.a as ja, coalesce(jv.n, 0) as jn,
           case when kel.a is null then null
                when jv.a is null  then kel.a
                else 0.6 * kel.a + 0.4 * jv.a end as tot
    from tb_kelompok k
    left join kel on kel.dinilai = k.nomor
    left join jv  on jv.dinilai  = k.nomor
    where k.nomor in (select unnest(finalis) from s)
  )
  select nomor, materi, segmen, round(ka, 3), kn, round(ja, 3), jn, round(tot, 3),
         (rank() over (order by tot desc nulls last))::int
  from t
$$;

-- ---------- fungsi untuk aplikasi ----------
create or replace function tb_status(p_kode text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a tb_akses; s tb_setting; nos int[];
begin
  a := tb_auth(p_kode, p_pin);
  select * into s from tb_setting where id = 1;
  nos := tb_target_nos(a);
  return jsonb_build_object(
    'akses', jsonb_build_object(
      'kode', a.kode, 'peran', a.peran, 'nama', a.nama, 'kelompok', a.kelompok, 'segmen', a.segmen,
      'materi', (select materi from tb_kelompok where nomor = a.kelompok),
      'segmen_nama', (select nama from tb_segmen where nomor = a.segmen)),
    'fase', s.fase,
    'terkunci', tb_terkunci(a),
    'aktif', (a.peran <> 'juri' or tb_juri_aktif(a)),
    'juri_aktif', s.juri_aktif,
    'final_tutup', s.final_tutup,
    'segmen_tutup', to_jsonb(s.segmen_tutup),
    'finalis_nos', to_jsonb(s.finalis),
    'hasil_tampil', s.hasil_tampil,
    'aspek', case when s.fase = 'final'
                  then jsonb_build_array('isi','praktik','penyampaian','tanya_jawab')
                  else jsonb_build_array('isi','praktik','penyampaian') end,
    'targets', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'nomor', k.nomor, 'materi', k.materi, 'segmen', k.segmen,
        'nilai', (select jsonb_build_object('isi', n.isi, 'praktik', n.praktik,
                                            'penyampaian', n.penyampaian, 'tanya_jawab', n.tanya_jawab)
                  from tb_nilai n where n.fase = s.fase and n.penilai = a.kode and n.dinilai = k.nomor)
      ) order by array_position(nos, k.nomor)), '[]'::jsonb)
      from tb_kelompok k where k.nomor = any (nos)),
    'suara', (select untuk from tb_suara where penilai = a.kode),
    'finalis', (
      select jsonb_agg(jsonb_build_object('nomor', k.nomor, 'materi', k.materi, 'segmen', k.segmen,
                                          'segmen_nama', (select nama from tb_segmen g where g.nomor = k.segmen))
                       order by k.segmen)
      from tb_kelompok k where k.nomor = any (s.finalis)),
    'hasil', case when s.hasil_tampil > 0 then (
      select jsonb_agg(jsonb_build_object('nomor', h.nomor, 'materi', h.materi, 'peringkat', h.peringkat)
                       order by h.peringkat, h.nomor)
      from tb_final_skor() h where h.peringkat <= s.hasil_tampil) else null end
  );
end $$;

create or replace function tb_nilai_simpan(
  p_kode text, p_pin text, p_dinilai int,
  p_isi int, p_praktik int, p_penyampaian int, p_tanya_jawab int default null
) returns void
language plpgsql security definer set search_path = public as $$
declare a tb_akses; s tb_setting;
begin
  a := tb_auth(p_kode, p_pin);
  select * into s from tb_setting where id = 1;
  if not (p_dinilai = any (tb_target_nos(a))) then
    raise exception 'Kelompok ini tidak bisa kamu nilai sekarang';
  end if;
  if tb_terkunci(a) then raise exception 'Penilaian sudah ditutup'; end if;
  if p_isi not in (1, 3, 5) or p_praktik not in (1, 3, 5) or p_penyampaian not in (1, 3, 5)
     or (p_tanya_jawab is not null and p_tanya_jawab not in (1, 3, 5)) then
    raise exception 'Nilai hanya boleh 1, 3, atau 5';
  end if;
  if s.fase = 'final' and p_tanya_jawab is null then raise exception 'Nilai Tanya Jawab belum diisi'; end if;
  insert into tb_nilai(fase, penilai, dinilai, isi, praktik, penyampaian, tanya_jawab, diubah)
  values (s.fase, a.kode, p_dinilai, p_isi, p_praktik, p_penyampaian,
          case when s.fase = 'final' then p_tanya_jawab else null end, now())
  on conflict (fase, penilai, dinilai) do update
    set isi = excluded.isi, praktik = excluded.praktik, penyampaian = excluded.penyampaian,
        tanya_jawab = excluded.tanya_jawab, diubah = now();
end $$;

-- suara "kelompok terbaik" di segmen (pemecah seri Tahap 1)
create or replace function tb_suara_simpan(p_kode text, p_pin text, p_untuk int) returns void
language plpgsql security definer set search_path = public as $$
declare a tb_akses; s tb_setting;
begin
  a := tb_auth(p_kode, p_pin);
  select * into s from tb_setting where id = 1;
  if a.peran <> 'kelompok' or s.fase <> 'tahap1' then raise exception 'Suara terbaik hanya untuk kelompok di Tahap 1'; end if;
  if not (p_untuk = any (tb_target_nos(a))) then raise exception 'Pilih kelompok lain di segmenmu'; end if;
  if tb_terkunci(a) then raise exception 'Penilaian sudah ditutup'; end if;
  insert into tb_suara(penilai, untuk, diubah) values (a.kode, p_untuk, now())
  on conflict (penilai) do update set untuk = excluded.untuk, diubah = now();
end $$;

-- ---------- fungsi admin ----------
create or replace function tb_admin_rekap(p_kode text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a tb_akses; s tb_setting; nfin int;
begin
  a := tb_auth(p_kode, p_pin);
  if a.peran <> 'admin' then raise exception 'Khusus admin'; end if;
  select * into s from tb_setting where id = 1;
  nfin := coalesce(array_length(s.finalis, 1), 0);
  return jsonb_build_object(
    'tahap1', (select coalesce(jsonb_agg(to_jsonb(t) order by t.segmen, t.peringkat, t.nomor), '[]'::jsonb) from tb_skor_tahap1() t),
    'final',  (select coalesce(jsonb_agg(to_jsonb(f) order by f.peringkat, f.nomor), '[]'::jsonb) from tb_final_skor() f),
    'progres_tahap1', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kode', ak.kode, 'nama', ak.nama, 'peran', ak.peran, 'segmen', ak.segmen,
        'sudah', (select count(*) from tb_nilai n where n.fase = 'tahap1' and n.penilai = ak.kode),
        'harap', (select count(*) from tb_kelompok k where k.segmen = ak.segmen) - case when ak.peran = 'kelompok' then 1 else 0 end,
        'suara', exists (select 1 from tb_suara u where u.penilai = ak.kode)
      ) order by ak.segmen, ak.peran, ak.kode), '[]'::jsonb)
      from tb_akses ak where ak.peran in ('kelompok','zona')),
    'progres_final', (
      select coalesce(jsonb_agg(jsonb_build_object(
        'kode', ak.kode, 'nama', ak.nama, 'peran', ak.peran,
        'sudah', (select count(*) from tb_nilai n where n.fase = 'final' and n.penilai = ak.kode),
        'harap', nfin - case when ak.peran = 'kelompok' and ak.kelompok = any (s.finalis) then 1 else 0 end
      ) order by ak.peran, ak.kode), '[]'::jsonb)
      from tb_akses ak
      where ak.peran = 'kelompok' or (ak.peran = 'juri' and substring(ak.kode from 2)::int <= s.juri_aktif))
  );
end $$;

create or replace function tb_admin_ubah(p_kode text, p_pin text, p_patch jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare a tb_akses;
begin
  a := tb_auth(p_kode, p_pin);
  if a.peran <> 'admin' then raise exception 'Khusus admin'; end if;
  update tb_setting set
    fase         = coalesce(p_patch ->> 'fase', fase),
    juri_aktif   = coalesce((p_patch ->> 'juri_aktif')::int, juri_aktif),
    final_tutup  = coalesce((p_patch ->> 'final_tutup')::boolean, final_tutup),
    hasil_tampil = coalesce((p_patch ->> 'hasil_tampil')::int, hasil_tampil),
    finalis      = case when p_patch ? 'finalis'
                        then array(select jsonb_array_elements_text(p_patch -> 'finalis')::int) else finalis end,
    segmen_tutup = case when p_patch ? 'segmen_tutup'
                        then array(select jsonb_array_elements_text(p_patch -> 'segmen_tutup')::int) else segmen_tutup end
  where id = 1;
end $$;

create or replace function tb_admin_akses(p_kode text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a tb_akses;
begin
  a := tb_auth(p_kode, p_pin);
  if a.peran <> 'admin' then raise exception 'Khusus admin'; end if;
  return (select coalesce(jsonb_agg(jsonb_build_object(
      'kode', x.kode, 'peran', x.peran, 'nama', x.nama, 'kelompok', x.kelompok, 'segmen', x.segmen,
      'segmen_nama', (select nama from tb_segmen g where g.nomor = x.segmen),
      'materi', (select materi from tb_kelompok k where k.nomor = x.kelompok), 'pin', x.pin
    ) order by case x.peran when 'admin' then 0 when 'juri' then 1 when 'zona' then 2 else 3 end, x.segmen, x.kode), '[]'::jsonb)
    from tb_akses x);
end $$;

-- kosongkan semua nilai dan pengaturan (untuk latihan sebelum acara)
create or replace function tb_admin_reset(p_kode text, p_pin text) returns void
language plpgsql security definer set search_path = public as $$
declare a tb_akses;
begin
  a := tb_auth(p_kode, p_pin);
  if a.peran <> 'admin' then raise exception 'Khusus admin'; end if;
  delete from tb_nilai where true;
  delete from tb_suara where true;
  update tb_setting set fase = 'tahap1', segmen_tutup = '{}', final_tutup = false,
                        finalis = '{}', hasil_tampil = 0 where id = 1;
end $$;

create or replace function tb_masuk(p_kode text, p_pin text) returns jsonb
language plpgsql stable security definer set search_path = public as $$
declare a tb_akses;
begin
  a := tb_auth(p_kode, p_pin);
  return jsonb_build_object('kode', a.kode, 'peran', a.peran, 'nama', a.nama);
end $$;

-- izin: hanya fungsi untuk aplikasi yang bisa dipanggil dari browser
revoke all on function tb_auth(text, text), tb_juri_aktif(tb_akses), tb_target_nos(tb_akses), tb_terkunci(tb_akses),
                       tb_skor_tahap1(), tb_final_skor() from public;
do $$ begin
  execute 'revoke all on function tb_auth(text, text), tb_juri_aktif(tb_akses), tb_target_nos(tb_akses), tb_terkunci(tb_akses), tb_skor_tahap1(), tb_final_skor() from anon, authenticated';
exception when undefined_object then null;
end $$;

grant execute on function
  tb_masuk(text, text), tb_status(text, text),
  tb_nilai_simpan(text, text, int, int, int, int, int), tb_suara_simpan(text, text, int),
  tb_admin_rekap(text, text), tb_admin_ubah(text, text, jsonb), tb_admin_akses(text, text), tb_admin_reset(text, text)
to anon, authenticated;

-- ---------- daftar kode & PIN (bagikan ke peserta) ----------
select kode, nama, peran, segmen, pin from tb_akses
order by case peran when 'admin' then 0 when 'juri' then 1 when 'zona' then 2 else 3 end, segmen, kode;
