#!/usr/bin/env bash
# Genera TP5-Summate.pdf a partir de TP5-Summate.md (marked + Chrome o Edge en modo headless).
# Uso: bash docs/entregas/generar-pdf.sh   (desde la raíz del repositorio)
set -euo pipefail

cd "$(dirname "$0")"

navegador=""
for c in \
  "/c/Program Files/Google/Chrome/Application/chrome.exe" \
  "/c/Program Files (x86)/Microsoft/Edge/Application/msedge.exe" \
  "$(command -v google-chrome 2>/dev/null || true)" \
  "$(command -v chromium 2>/dev/null || true)"; do
  if [ -n "$c" ] && [ -x "$c" ]; then navegador="$c"; break; fi
done
[ -n "$navegador" ] || { echo "No se encontró Chrome ni Edge." >&2; exit 1; }

html="$(mktemp --suffix=.html)"
trap 'rm -f "$html"' EXIT

{
  cat <<'CSS'
<!doctype html><html lang="es"><head><meta charset="utf-8"><style>
body{font-family:Calibri,Arial,sans-serif;font-size:11pt;line-height:1.4;margin:0}
h1{font-size:20pt}h2{font-size:15pt;margin-top:1.4em}h3{font-size:12.5pt}h4{font-size:11.5pt}
table{border-collapse:collapse;width:100%;margin:.6em 0;font-size:9.5pt}
th,td{border:1px solid #888;padding:3px 6px;vertical-align:top;text-align:left}
th{background:#eee}blockquote{border-left:3px solid #aaa;margin-left:0;padding-left:10px;color:#333}
code{font-size:9.5pt}
</style></head><body>
CSS
  npx --yes marked@12.0.2 --gfm -i TP5-Summate.md
  echo "</body></html>"
} > "$html"

"$navegador" --headless --disable-gpu --no-pdf-header-footer \
  --print-to-pdf="$(cygpath -w "$PWD/TP5-Summate.pdf" 2>/dev/null || echo "$PWD/TP5-Summate.pdf")" \
  "file:///$(cygpath -m "$html" 2>/dev/null || echo "$html")"

echo "Generado: docs/entregas/TP5-Summate.pdf"
