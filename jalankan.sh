#!/usr/bin/env bash
# Jalankan dari root repo (folder gowithdme) di Codespaces:  bash jalankan.sh
set -e
python3 tools/build.py          # bangun ulang id/ en/ js/i18n.js dari src + strings.py
echo "Buka tab PORTS -> port 8000 -> ikon globe, lalu tambahkan /id/ di alamatnya."
python3 -m http.server 8000     # server lokal (Ctrl+C untuk berhenti)
