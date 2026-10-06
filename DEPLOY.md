# Panduan Deploy — QMS BONECOM

Deploy ke produksi (https://qms.bonecomtricom.net) dilakukan lewat `deploy.sh`.

---

## Ringkas

```bash
npm run build      # WAJIB bila ada perubahan frontend
./deploy.sh
```

Selesai. Script mengurus backup, pengiriman, pembersihan cache, dan verifikasi.

---

## Prasyarat

Jalankan dari **Git Bash** (bukan PowerShell/CMD) di direktori project:

```bash
cd /c/Users/itbti/iso-dms/iso-app
```

Yang harus tersedia:

| Kebutuhan | Cara memastikan |
|---|---|
| Akses SSH tanpa password | `ssh qms` harus langsung masuk tanpa diminta password |
| Build frontend terkini | `npm run build` bila ada perubahan di `resources/js` atau CSS |

Server sudah punya PHP 8.3, Composer, MySQL, dan rsync. Server **tidak** punya Node/npm — karena itu build frontend wajib dilakukan di komputer lokal.

---

## Perintah

| Perintah | Fungsi |
|---|---|
| `./deploy.sh` | Deploy normal. Backup otomatis dibuat lebih dulu. |
| `./deploy.sh --dry-run` | Tampilkan apa yang akan dikirim. **Tidak mengubah apa pun.** |
| `./deploy.sh --migrate` | Deploy + jalankan migration database. |
| `./deploy.sh --optimize` | Deploy + cache config/route/view untuk performa. |
| `./deploy.sh --rollback` | Kembalikan ke backup terakhir. |
| `./deploy.sh --rollback <id>` | Kembalikan ke backup tertentu. |
| `./deploy.sh --list-backups` | Daftar backup yang tersedia. |
| `./deploy.sh --help` | Bantuan singkat. |

Flag bisa digabung, contoh: `./deploy.sh --migrate --optimize`

---

## Alur Kerja Harian

**1. Sebelum deploy — lihat dulu apa yang akan terkirim**

```bash
./deploy.sh --dry-run
```

Biasakan langkah ini untuk perubahan besar. Tidak ada risiko sama sekali.

**2. Bila ada perubahan frontend**

```bash
npm run build
```

Script akan memperingatkan bila mendeteksi source frontend lebih baru daripada hasil build — gejala klasik lupa menjalankan perintah ini.

**3. Deploy**

```bash
./deploy.sh
```

**4. Bila ada migration baru**

```bash
./deploy.sh --migrate
```

---

## Yang Dilindungi

Prinsipnya sederhana: **yang tidak dikirim, mustahil tertimpa.** Perlindungan dilakukan lewat daftar exclude, bukan logika kondisional yang bisa keliru.

Tidak pernah dikirim ke server:

| Path | Alasan |
|---|---|
| `.env` | Kredensial produksi — berbeda dari lokal |
| `storage/` | File upload pengguna, log, cache framework |
| `public/storage` | Symlink ke `storage/app/public` |
| `vendor/` | Dipasang di server via Composer |
| `node_modules/` | 387 MB, tidak terpakai di server |
| `bootstrap/cache/*.php` | Cache lokal — **pernah menyebabkan produksi mati**, lihat Troubleshooting |
| `tests/`, `.git/`, `.github/`, `.claude/` | Artefak development |

Berapa kali pun deploy dijalankan, file upload dan konfigurasi produksi tidak akan tersentuh.

---

## Backup

Setiap deploy membuat backup **sebelum** perubahan apa pun, di `~/backups/qms/<timestamp>` pada server:

| Isi | Keterangan |
|---|---|
| `database.sql.gz` | Dump lengkap, konsisten, tanpa mengunci tabel |
| `code.tar.gz` | Kode aplikasi |
| `storage-app.tar.gz` | File upload pengguna |
| `env.backup` | Salinan `.env` produksi |

Lokasi backup berada **di luar** docroot dan ber-permission `700` — tidak bisa diakses dari web maupun oleh pengguna lain di shared hosting.

Rotasi otomatis: 5 backup terbaru disimpan, sisanya dihapus.

```bash
./deploy.sh --list-backups
```

---

## Rollback

Bila deploy bermasalah:

```bash
./deploy.sh --rollback
```

Script meminta Anda mengetik `ROLLBACK` sebagai konfirmasi.

**Yang dipulihkan:** kode + database
**Yang TIDAK disentuh:** file upload di `storage/app`

### Konsekuensi yang perlu dipahami

Rollback mengembalikan database ke kondisi saat backup dibuat. Artinya:

* Pengguna yang login **setelah** backup akan diminta login ulang.
* Semua perubahan data **setelah** backup akan **hilang** — termasuk temuan audit, dokumen, atau approval yang dibuat di rentang waktu itu.

Karena itu: **semakin cepat rollback dijalankan setelah deploy bermasalah, semakin sedikit yang hilang.**

### Rollback atau perbaiki maju?

Bila penyebab masalah sudah jelas dan perbaikannya sederhana, **perbaiki maju** sering lebih tepat daripada rollback — tidak ada data yang hilang sama sekali. Rollback adalah pilihan ketika penyebabnya belum jelas dan situs harus segera pulih.

---

## Bila Deploy Gagal

Script melakukan health check otomatis setelah deploy. Bila gagal, ia menampilkan error terakhir dari server dan perintah rollback yang siap disalin:

```
✗ Health check GAGAL setelah deploy

  Error terakhir dari server:
    production.ERROR: ...

  ! Situs kemungkinan tidak berfungsi. Rollback:
    ./deploy.sh --rollback 20260718-213306
```

Situs dijamin keluar dari maintenance mode apa pun yang terjadi — termasuk bila script mati di tengah jalan.

---

## Troubleshooting

### HTTP 500 di semua halaman setelah deploy

Penyebab paling mungkin: cache package-discovery dari komputer lokal ikut terkirim. Komputer lokal punya dependensi development (Pail, Sail, Collision) yang tidak dipasang di produksi, sehingga Laravel mencari class yang tidak ada.

Script sudah mencegah ini lewat dua lapis (exclude + regenerasi otomatis). Bila tetap terjadi:

```bash
ssh qms
cd ~/domains/bonecomtricom.net/public_html/qms
rm -f bootstrap/cache/services.php bootstrap/cache/packages.php
php artisan package:discover
php artisan optimize:clear
```

### Aset frontend tidak berubah setelah deploy

Lupa menjalankan `npm run build`. Jalankan, lalu deploy ulang.

### Perubahan `.env` tidak berefek

Terjadi bila pernah deploy dengan `--optimize` (config ter-cache). Bersihkan:

```bash
ssh qms 'cd ~/domains/bonecomtricom.net/public_html/qms && php artisan config:clear'
```

Ini alasan `--optimize` sengaja dibuat opt-in, bukan default.

### Script gagal membaca kredensial database

File `.env` di server memakai line ending Windows (CRLF). Script sudah menanganinya. Bila menulis script sendiri yang membaca `.env`, wajib tambahkan `tr -d '\r'` — tanpa itu, karakter `\r` ikut terbaca dan autentikasi MySQL gagal, padahal Laravel sendiri tetap normal.

### SSH minta password

```bash
ssh qms    # uji koneksi
```

Bila diminta password, periksa `~/.ssh/config` — entri `qms` harus menunjuk ke key `~/.ssh/ems_hostinger`.

---

## Catatan Teknis

* Pengiriman memakai tar yang di-*stream* langsung lewat SSH (~790 KB), tanpa file arsip perantara. Tidak ada sisa arsip menumpuk di server.
* Kredensial database tidak pernah diteruskan sebagai argumen perintah — argumen terlihat pengguna lain lewat `ps` di shared hosting. Script memakai file `--defaults-extra-file` ber-permission `600`.
* Composer hanya dijalankan bila `composer.lock` berubah.
* Aset build lama dihapus setiap deploy agar file ber-hash usang tidak menumpuk.
* Konfigurasi ada di bagian atas `deploy.sh` (`REMOTE`, `APP_DIR`, `BACKUP_DIR`, `KEEP_BACKUPS`, `HEALTH_URL`).
