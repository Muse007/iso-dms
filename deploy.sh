#!/usr/bin/env bash
#
# Deploy QMS BONECOM  →  qms.bonecomtricom.net
#
# Dijalankan dari Git Bash di mesin lokal Windows.
#   ./deploy.sh                 deploy normal (backup otomatis)
#   ./deploy.sh --dry-run       tampilkan rencana, tidak mengubah apa pun
#   ./deploy.sh --migrate       deploy + jalankan migration (opt-in)
#   ./deploy.sh --optimize      deploy + cache config/route/view (lihat catatan)
#   ./deploy.sh --rollback      kembalikan ke backup terakhir
#   ./deploy.sh --list-backups  daftar backup yang tersedia
#   ./deploy.sh --help
#
# PRINSIP KESELAMATAN
#   1. Data produksi TIDAK PERNAH dikirim/ditimpa. Yang tidak dikirim
#      tidak mungkin tertimpa — .env, storage/, dan symlink dilindungi
#      lewat daftar exclude, bukan lewat logika kondisional.
#   2. Backup (database + kode + file upload) dibuat SEBELUM perubahan apa pun.
#   3. Setiap kegagalan memicu rollback otomatis dan mengembalikan situs online.
#   4. Migration bersifat opt-in — tidak pernah berjalan tanpa diminta.

set -Eeuo pipefail

# ─────────────────────────── Konfigurasi ───────────────────────────
REMOTE="qms"                                              # alias di ~/.ssh/config
APP_DIR="domains/bonecomtricom.net/public_html/qms"       # relatif thd $HOME server
BACKUP_DIR="backups/qms"                                  # DI LUAR docroot
KEEP_BACKUPS=5
HEALTH_URL="https://qms.bonecomtricom.net/login"
HEALTH_EXPECT="QMS"                                       # penanda di HTML halaman sehat

LOCAL_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# Path yang TIDAK PERNAH dikirim ke server.
# Ini adalah inti keselamatan script: data produksi tidak ikut dalam arsip,
# sehingga mustahil tertimpa berapa kali pun deploy dijalankan.
EXCLUDES=(
  # Data & konfigurasi produksi — MUTLAK jangan disentuh
  ".env"                      # kredensial produksi (berbeda dari lokal)
  ".env.*"
  "storage"                   # file upload, log, cache framework
  "public/storage"            # symlink → storage/app/public
  "database/database.sqlite"  # produksi memakai MySQL

  # Dibangun/dipasang di server atau tidak dipakai runtime
  "node_modules"              # 387 MB, server tidak punya Node
  "vendor"                    # dipasang via composer di server
  "public/hot"                # penanda Vite dev — merusak produksi bila terkirim
  "public/build/.vite"

  # WAJIB: cache package-discovery milik mesin lokal.
  # Lokal memasang dependensi dev (Pail, Sail, Collision); services.php
  # lokal mendaftarkan ServiceProvider mereka. Vendor produksi dipasang
  # --no-dev sehingga class itu tidak ada → container gagal → HTTP 500.
  # Server membangun cache-nya sendiri lewat `php artisan package:discover`.
  "bootstrap/cache/*.php"

  # Artefak development
  ".git" ".github" ".claude" ".idea" ".vscode"
  "tests" "phpunit.xml" "eslint.config.js"
  "*.log" "error_log"
  "deploy.sh" ".deployignore"

  # Sampah OS / dokumen tercecer
  ".DS_Store" "Thumbs.db"
  "*.pdf" "*.doc" "*.docx" "*.pptx" "*.drawio"
  "mockup.html" "response.html"
)

# ─────────────────────────── Utilitas ───────────────────────────
C_OK=$'\033[32m'; C_ERR=$'\033[31m'; C_WARN=$'\033[33m'; C_DIM=$'\033[2m'; C_B=$'\033[1m'; C_0=$'\033[0m'
log()  { printf '%s\n' "${C_B}▸${C_0} $*"; }
ok()   { printf '%s\n' "  ${C_OK}✓${C_0} $*"; }
warn() { printf '%s\n' "  ${C_WARN}!${C_0} $*"; }
die()  { printf '%s\n' "  ${C_ERR}✗ $*${C_0}" >&2; exit 1; }
dim()  { printf '%s\n' "${C_DIM}$*${C_0}"; }

DRY_RUN=0; DO_MIGRATE=0; DO_ROLLBACK=0; LIST_BACKUPS=0; DO_OPTIMIZE=0; ROLLBACK_ID=""

usage() { sed -n '2,20p' "${BASH_SOURCE[0]}" | sed 's/^# \{0,1\}//'; exit 0; }

while [[ $# -gt 0 ]]; do
  case "$1" in
    --dry-run)      DRY_RUN=1 ;;
    --migrate)      DO_MIGRATE=1 ;;
    --optimize)     DO_OPTIMIZE=1 ;;
    --rollback)     DO_ROLLBACK=1; [[ "${2-}" =~ ^[0-9]{8}-[0-9]{6}$ ]] && { ROLLBACK_ID="$2"; shift; } ;;
    --list-backups) LIST_BACKUPS=1 ;;
    -h|--help)      usage ;;
    *)              die "Opsi tidak dikenal: $1  (lihat --help)" ;;
  esac
  shift
done

# Jalankan perintah di server. Semua akses SSH lewat satu fungsi ini.
rexec() { ssh -o BatchMode=yes "$REMOTE" "bash -s" ; }

# ─────────────────────── Helper sisi server ───────────────────────
# Dikirim ke server sebagai prelude tiap sesi bash jarak jauh.
# env_val() membuang \r: file .env server memakai line ending CRLF
# (terunggah dari Windows). Tanpa ini, password terbaca 1 byte lebih
# panjang dan autentikasi MySQL gagal secara diam-diam.
REMOTE_PRELUDE=$(cat <<'PRELUDE'
set -Eeuo pipefail
APP="$HOME/__APP_DIR__"
BAK="$HOME/__BACKUP_DIR__"
env_val() {
  grep -E "^$1=" "$APP/.env" | head -1 | cut -d= -f2- | tr -d '\r' \
    | sed -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//"
}
# Tulis kredensial ke defaults-file (mode 600) alih-alih meneruskannya
# sebagai argumen CLI — argumen terlihat oleh pengguna lain via `ps`.
mysql_defaults_file() {
  local f; f=$(mktemp); chmod 600 "$f"
  printf '[client]\nuser=%s\npassword=%s\nhost=%s\n' \
    "$(env_val DB_USERNAME)" "$(env_val DB_PASSWORD)" "$(env_val DB_HOST)" > "$f"
  printf '%s' "$f"
}
PRELUDE
)
REMOTE_PRELUDE="${REMOTE_PRELUDE//__APP_DIR__/$APP_DIR}"
REMOTE_PRELUDE="${REMOTE_PRELUDE//__BACKUP_DIR__/$BACKUP_DIR}"

# ─────────────────────────── Sub-perintah ───────────────────────────
list_backups() {
  log "Backup tersedia di server (~/$BACKUP_DIR)"
  rexec <<EOF
$REMOTE_PRELUDE
[ -d "\$BAK" ] || { echo "  (belum ada backup)"; exit 0; }
cd "\$BAK"
for d in \$(ls -1d 20*/ 2>/dev/null | sort -r); do
  id="\${d%/}"
  printf "  %s  %6s  %s\n" "\$id" "\$(du -sh "\$id" 2>/dev/null | cut -f1)" \
    "\$(cat "\$id/MANIFEST" 2>/dev/null | head -1)"
done
EOF
}

do_rollback() {
  log "ROLLBACK"
  local id="$ROLLBACK_ID"
  [[ -z "$id" ]] && id=$(rexec <<EOF
$REMOTE_PRELUDE
ls -1d "\$BAK"/20*/ 2>/dev/null | sort -r | head -1 | xargs -r basename
EOF
)
  [[ -z "$id" ]] && die "Tidak ada backup untuk dipulihkan."
  warn "Akan memulihkan kode + database dari backup: $id"
  warn "File upload (storage/app) TIDAK disentuh — data tetap seperti sekarang."
  # Tabel `sessions` ikut dipulihkan, jadi sesi yang dibuat setelah backup
  # akan hilang. Ini melekat pada rollback database, bukan bug — tetapi
  # operator harus tahu sebelum menjalankannya di jam kerja.
  warn "Pengguna yang login SETELAH backup dibuat akan diminta login ulang."
  warn "Perubahan data SETELAH backup ($id) akan HILANG."
  read -rp "  Ketik 'ROLLBACK' untuk melanjutkan: " c
  [[ "$c" == "ROLLBACK" ]] || die "Dibatalkan."

  rexec <<EOF
$REMOTE_PRELUDE
B="\$BAK/$id"
[ -d "\$B" ] || { echo "Backup $id tidak ditemukan"; exit 1; }
cd "\$APP"
php artisan down --retry=30 >/dev/null 2>&1 || true
trap 'cd "\$APP" && php artisan up >/dev/null 2>&1 || true' EXIT

echo "  memulihkan kode..."
tar xzf "\$B/code.tar.gz" -C "\$APP" --no-same-owner

if [ -f "\$B/database.sql.gz" ]; then
  echo "  memulihkan database..."
  DF=\$(mysql_defaults_file)
  gunzip -c "\$B/database.sql.gz" | mysql --defaults-extra-file="\$DF" "\$(env_val DB_DATABASE)"
  rm -f "\$DF"
fi

php artisan optimize:clear >/dev/null 2>&1 || true
php artisan up >/dev/null 2>&1 || true
trap - EXIT
echo "  selesai."
EOF
  health_check || die "Rollback selesai tetapi health check gagal — periksa manual."
  ok "Rollback ke $id berhasil."
}

health_check() {
  local code body
  for i in 1 2 3; do
    code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$HEALTH_URL" || echo 000)
    if [[ "$code" == "200" ]]; then
      body=$(curl -s --max-time 20 "$HEALTH_URL" || true)
      [[ "$body" == *"$HEALTH_EXPECT"* ]] && { ok "Health check OK (HTTP 200)"; return 0; }
      warn "HTTP 200 tetapi konten tak terduga (percobaan $i/3)"
    else
      warn "HTTP $code (percobaan $i/3)"
    fi
    sleep 3
  done
  return 1
}

# ─────────────────────────── Pre-flight ───────────────────────────
preflight() {
  log "Pre-flight"

  [[ -f "$LOCAL_DIR/artisan" ]] || die "Bukan root project Laravel: $LOCAL_DIR"
  ok "Root project valid"

  ssh -o BatchMode=yes -o ConnectTimeout=15 "$REMOTE" true 2>/dev/null \
    || die "SSH ke '$REMOTE' gagal. Uji dengan: ssh $REMOTE"
  ok "SSH terhubung"

  [[ -f "$LOCAL_DIR/public/build/manifest.json" ]] \
    || die "public/build/manifest.json tidak ada. Jalankan: npm run build"

  # Peringatkan bila source frontend lebih baru daripada hasil build —
  # gejala klasik lupa menjalankan `npm run build` sebelum deploy.
  local newest_src build_time
  newest_src=$(find "$LOCAL_DIR/resources" -type f \( -name '*.js' -o -name '*.jsx' -o -name '*.ts' -o -name '*.tsx' -o -name '*.css' \) -newer "$LOCAL_DIR/public/build/manifest.json" 2>/dev/null | head -1)
  if [[ -n "$newest_src" ]]; then
    warn "Source frontend lebih baru daripada build — kemungkinan lupa 'npm run build'"
    warn "  contoh: ${newest_src#"$LOCAL_DIR"/}"
    read -rp "  Lanjutkan tanpa build ulang? [y/N] " a
    [[ "$a" =~ ^[Yy]$ ]] || die "Dibatalkan. Jalankan: npm run build"
  else
    ok "Build assets mutakhir"
  fi

  # Ruang disk server: butuh ruang untuk backup + arsip sementara.
  local avail
  avail=$(ssh -o BatchMode=yes "$REMOTE" "df -Pk \$HOME | tail -1 | awk '{print \$4}'")
  if (( avail < 512000 )); then
    die "Ruang disk server tinggal $((avail/1024)) MB — terlalu sedikit untuk deploy aman."
  fi
  ok "Ruang disk server: $((avail/1024/1024)) GB"

  # Verifikasi .env produksi ada. Bila hilang, deploy akan menghasilkan
  # aplikasi tanpa konfigurasi — hentikan lebih awal.
  ssh -o BatchMode=yes "$REMOTE" "test -f \$HOME/$APP_DIR/.env" \
    || die ".env produksi tidak ditemukan di server — hentikan."
  ok ".env produksi ada (tidak akan disentuh)"
}

# ─────────────────────────── Backup ───────────────────────────
run_backup() {
  log "Backup"
  BACKUP_ID=$(date +%Y%m%d-%H%M%S)
  rexec <<EOF
$REMOTE_PRELUDE
B="\$BAK/$BACKUP_ID"
mkdir -p "\$B"
# Shared hosting: pengguna lain berbagi mesin yang sama. Backup berisi
# dump database lengkap dan kredensial, jadi hanya pemilik yang boleh baca.
chmod 700 "\$BAK" "\$B" 2>/dev/null || true
cd "\$APP"

# 1. Database — --single-transaction agar konsisten tanpa mengunci tabel,
#    sehingga pengguna tetap bisa membaca selama dump berjalan.
DF=\$(mysql_defaults_file)
mysqldump --defaults-extra-file="\$DF" --single-transaction --quick \
  --routines --triggers --events "\$(env_val DB_DATABASE)" 2>/dev/null | gzip -6 > "\$B/database.sql.gz"
rm -f "\$DF"
[ -s "\$B/database.sql.gz" ] || { echo "BACKUP DATABASE GAGAL"; exit 1; }
echo "  database : \$(du -h "\$B/database.sql.gz" | cut -f1)"

# 2. Kode saat ini (tanpa dependensi yang bisa dibangun ulang)
tar czf "\$B/code.tar.gz" --exclude=node_modules --exclude=vendor \
    --exclude=storage --exclude='.git' -C "\$APP" . 2>/dev/null
echo "  kode     : \$(du -h "\$B/code.tar.gz" | cut -f1)"

# 3. File upload pengguna — data paling berharga & tidak bisa dibuat ulang
if [ -d "\$APP/storage/app" ]; then
  tar czf "\$B/storage-app.tar.gz" -C "\$APP/storage" app 2>/dev/null
  echo "  uploads  : \$(du -h "\$B/storage-app.tar.gz" | cut -f1) (\$(find "\$APP/storage/app" -type f | wc -l) file)"
fi

# 4. Salinan .env — kredensial produksi, tidak ada di mana pun selain di sini
cp "\$APP/.env" "\$B/env.backup"; chmod 600 "\$B/env.backup"

printf 'Laravel %s | %s file upload | %s tabel DB\n' \
  "\$(cd "\$APP" && php artisan --version 2>/dev/null | grep -oE '[0-9]+\.[0-9]+\.[0-9]+')" \
  "\$(find "\$APP/storage/app" -type f 2>/dev/null | wc -l)" \
  "\$(gunzip -c "\$B/database.sql.gz" | grep -c '^CREATE TABLE')" > "\$B/MANIFEST"

# Rotasi: simpan $KEEP_BACKUPS terbaru
cd "\$BAK"
ls -1d 20*/ 2>/dev/null | sort -r | tail -n +$((KEEP_BACKUPS+1)) | xargs -r rm -rf
chmod 600 "\$B"/* 2>/dev/null || true
echo "  total    : \$(du -sh "\$B" | cut -f1)  →  \$BAK/$BACKUP_ID (mode 700)"
EOF
  ok "Backup selesai: $BACKUP_ID"
}

# ─────────────────────────── Deploy ───────────────────────────
build_tar_args() {
  TAR_ARGS=()
  for e in "${EXCLUDES[@]}"; do TAR_ARGS+=(--exclude="$e"); done
}

run_deploy() {
  build_tar_args

  if (( DRY_RUN )); then
    log "DRY RUN — tidak ada perubahan"
    echo

    # Arsip dibuat SEKALI ke /dev/null, daftar isi ditampung di file
    # sementara. Menyalurkan tar langsung ke `head` akan memicu SIGPIPE
    # yang, dengan pipefail+errexit, mematikan script sebelum ringkasan.
    local listing sz n
    listing=$(mktemp)
    sz=$(tar cz "${TAR_ARGS[@]}" -C "$LOCAL_DIR" . --verbose 2>"$listing" | wc -c)
    n=$(wc -l < "$listing")

    dim "  File yang AKAN dikirim (30 pertama dari $n):"
    sed -n '1,30p' "$listing" | sed 's/^/    /'
    (( n > 30 )) && dim "    … dan $((n-30)) entri lainnya"
    rm -f "$listing"
    echo
    if (( sz < 1048576 )); then
      dim "  Total: $n entri, $((sz/1024)) KB terkompresi"
    else
      dim "  Total: $n entri, $((sz/1048576)) MB terkompresi"
    fi
    echo
    dim "  DILINDUNGI (tidak dikirim, tidak mungkin tertimpa):"
    printf '    %s\n' ".env" "storage/ (upload, log, cache)" "public/storage (symlink)" \
                      "node_modules/" "vendor/ (via composer di server)"
    echo
    dim "  Migration : $( ((DO_MIGRATE))  && echo 'YA (--migrate)'  || echo 'tidak' )"
    dim "  Optimize  : $( ((DO_OPTIMIZE)) && echo 'YA (--optimize)' || echo 'tidak (cache hanya dibersihkan)' )"
    return 0
  fi

  log "Deploy"

  # Kirim daftar file yang mungkin sudah usang di public/build supaya
  # aset lama berhash tidak menumpuk tanpa batas.
  local composer_hash_local
  composer_hash_local=$(md5sum "$LOCAL_DIR/composer.lock" | cut -d' ' -f1)

  # Streaming tar langsung lewat SSH — tidak ada file arsip perantara,
  # tidak ada sisa 99 MB di server seperti pendekatan zip sebelumnya.
  dim "  mengirim kode (stream tar → ssh)…"
  tar cz "${TAR_ARGS[@]}" -C "$LOCAL_DIR" . \
    | ssh -o BatchMode=yes "$REMOTE" "cat > \$HOME/$APP_DIR/.deploy-incoming.tar.gz"
  ok "Kode terkirim"

  rexec <<EOF
$REMOTE_PRELUDE
cd "\$APP"

# Mulai dari sini situs offline. Trap menjamin situs kembali online
# apa pun yang terjadi setelahnya — termasuk bila script gagal.
php artisan down --retry=30 >/dev/null 2>&1 || true
trap 'cd "\$APP" && php artisan up >/dev/null 2>&1 || true' EXIT

# Aset build lama dihapus agar file berhash usang tidak menumpuk.
# Aman: seluruh isinya dihasilkan ulang dari arsip yang baru dikirim.
rm -rf public/build

tar xzf .deploy-incoming.tar.gz -C "\$APP" --no-same-owner
rm -f .deploy-incoming.tar.gz
echo "  kode diekstrak"

# Dependensi PHP hanya dipasang ulang bila composer.lock berubah.
#
# Pembandingnya WAJIB sidik jari lock yang dipakai saat vendor terakhir
# dipasang, bukan composer.lock yang ada di disk: file itu baru saja
# ditimpa oleh arsip sehingga selalu identik dengan yang lokal — dulu
# perbandingannya begitu, dan akibatnya composer tidak pernah jalan lagi
# meski ada dependensi baru (PhpSpreadsheet sempat luput karena ini).
# Sidik jari disimpan di dalam vendor/ yang tidak pernah ikut terkirim.
VENDOR_STAMP=vendor/.deploy-lock-md5
LOCK_INSTALLED=\$(cat "\$VENDOR_STAMP" 2>/dev/null || echo none)
if [ ! -f vendor/autoload.php ] || [ "\$LOCK_INSTALLED" != "$composer_hash_local" ]; then
  echo "  composer install (--no-dev)…"
  composer install --no-dev --optimize-autoloader --no-interaction --no-progress 2>&1 | tail -3
  md5sum composer.lock | cut -d' ' -f1 > "\$VENDOR_STAMP"
else
  echo "  vendor mutakhir — composer dilewati"
fi

# Pertahanan berlapis: bangun ulang cache package-discovery dari vendor
# produksi yang sebenarnya. Bila cache lokal pernah lolos exclude, langkah
# ini menimpanya dengan yang benar sebelum request pertama masuk.
php artisan package:discover --quiet >/dev/null 2>&1 || true

# Symlink storage dipulihkan bila hilang (mis. terhapus tak sengaja).
[ -L public/storage ] || php artisan storage:link >/dev/null 2>&1 || true

$( ((DO_MIGRATE)) && cat <<'MIG'
echo "  migration…"
php artisan migrate --force 2>&1 | tail -5
MIG
)

# Cache selalu DIBERSIHKAN agar kode baru pasti terpakai.
php artisan optimize:clear >/dev/null 2>&1 || true
echo "  cache dibersihkan"

$( ((DO_OPTIMIZE)) && cat <<'OPT'
# --optimize: cache konfigurasi/route/view untuk performa.
# Perhatian: setelah config:cache, perubahan .env tidak berefek sampai
# cache dibersihkan. Karena itu ini opt-in, bukan perilaku default.
php artisan config:cache >/dev/null 2>&1 || true
php artisan route:cache  >/dev/null 2>&1 || true
php artisan view:cache   >/dev/null 2>&1 || true
echo "  cache performa dibangun (config/route/view)"
OPT
)

php artisan up >/dev/null 2>&1 || true
trap - EXIT
echo "  situs kembali online"
EOF
  ok "Deploy selesai"
}

# ─────────────────────────── Alur utama ───────────────────────────
main() {
  echo
  printf '%s\n' "${C_B}QMS BONECOM · Deploy${C_0}  ${C_DIM}→ $HEALTH_URL${C_0}"
  echo

  (( LIST_BACKUPS )) && { list_backups; exit 0; }
  (( DO_ROLLBACK ))  && { do_rollback; exit 0; }

  preflight
  echo

  if (( DRY_RUN )); then run_deploy; echo; exit 0; fi

  run_backup
  echo

  # Bila deploy gagal setelah backup dibuat, tawarkan rollback otomatis.
  trap 'echo; printf "%s\n" "${C_ERR}✗ Deploy gagal.${C_0}"; \
        printf "%s\n" "  Pulihkan dengan: ./deploy.sh --rollback ${BACKUP_ID-}"; \
        ssh -o BatchMode=yes "$REMOTE" "cd \$HOME/$APP_DIR && php artisan up" >/dev/null 2>&1 || true; \
        exit 1' ERR

  run_deploy
  echo

  log "Verifikasi"
  if health_check; then
    trap - ERR
    echo
    printf '%s\n' "${C_OK}${C_B}✓ Deploy berhasil${C_0}"
    dim "  backup   : $BACKUP_ID"
    dim "  rollback : ./deploy.sh --rollback $BACKUP_ID"
    echo
  else
    echo
    printf '%s\n' "${C_ERR}${C_B}✗ Health check GAGAL setelah deploy${C_0}"
    echo
    # Tampilkan penyebabnya langsung — tanpa ini, diagnosis berarti
    # SSH manual dan menggali stack trace saat situs sedang mati.
    dim "  Error terakhir dari server:"
    ssh -o BatchMode=yes "$REMOTE" \
      "grep -oE 'production\.ERROR: [^{]{0,180}' \$HOME/$APP_DIR/storage/logs/laravel.log 2>/dev/null | tail -3" \
      2>/dev/null | sed 's/^/    /' || dim "    (tidak terbaca)"
    echo
    warn "Situs kemungkinan tidak berfungsi. Rollback:"
    dim "    ./deploy.sh --rollback $BACKUP_ID"
    exit 1
  fi
}

main "$@"
