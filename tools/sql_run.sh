#!/usr/bin/env bash
# Jalankan satu berkas SQL ke Supabase tanpa SQL Editor.
# Pakai:  export SUPABASE_ACCESS_TOKEN=sbp_xxx ; bash tools/sql_run.sh supabase/namafile.sql
set -e
cd "$(dirname "$0")/.."
[ -n "$SUPABASE_ACCESS_TOKEN" ] && [ -f "$1" ] || { echo "Pakai: export SUPABASE_ACCESS_TOKEN=sbp_xxx ; bash tools/sql_run.sh supabase/berkas.sql"; exit 1; }
python3 - "$1" <<'PY'
import sys,json,os,re,urllib.request,urllib.error
ref=re.search(r'https://([a-z0-9]+)\.supabase\.co',open("js/config.js").read()).group(1)
req=urllib.request.Request(f"https://api.supabase.com/v1/projects/{ref}/database/query",data=json.dumps({"query":open(sys.argv[1],encoding="utf-8").read()}).encode(),
 headers={"Authorization":"Bearer "+os.environ["SUPABASE_ACCESS_TOKEN"],"Content-Type":"application/json","User-Agent":"gwm-sql"},method="POST")
try: print("OK",urllib.request.urlopen(req,timeout=120).status)
except urllib.error.HTTPError as e: print("GAGAL",e.code,e.read().decode()[:500]); sys.exit(1)
PY
