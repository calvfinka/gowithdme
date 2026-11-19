#!/usr/bin/env bash
# Jalankan dari root repo di Codespaces:  bash jalankan.sh
set -e
# Versi tetap (dari commit terakhir) supaya build lokal tidak mengubah berkas ?v= dan tidak mengotori git status.
export GWM_VER="${GWM_VER:-$(git log -1 --format=%cd --date=format:%Y%m%d%H%M -- css js src tools assets 2>/dev/null || true)}"
python3 tools/build.py          # bangun ulang id/ en/ js/i18n.js dari src + strings.py
echo "Buka tab PORTS -> port 8000 -> ikon globe, lalu tambahkan /id/ di alamatnya."
python3 tools/serve.py 8000     # URL bersih + 404.html seperti GitHub Pages (Ctrl+C untuk berhenti)
