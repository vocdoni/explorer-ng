#!/bin/sh
# Rewrites the runtime configuration bundle that index.html loads before the
# application code. Running this on every container start is what lets one
# pre-built image be pointed at a different gateway without a rebuild.
set -eu

ROOT="${NGINX_HTML_ROOT:-/usr/share/nginx/html}"
API_URL="${VOCONE_API_URL:-https://api.vocdoni.io/v2}"
REFRESH_MS="${VOCONE_REFRESH_MS:-15000}"

cat > "${ROOT}/runtime-config.js" <<EOF
window.__RUNTIME_CONFIG__ = {
  VOCONE_API_URL: '${API_URL}',
  VOCONE_REFRESH_MS: '${REFRESH_MS}',
}
EOF

echo "runtime-config.js written: api=${API_URL} refresh=${REFRESH_MS}ms"
