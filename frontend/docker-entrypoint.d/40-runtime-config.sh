#!/bin/sh
set -eu

backend_url="${REACT_APP_BACKEND_URL:-}"
backend_url=$(printf '%s' "$backend_url" | sed 's/\\/\\\\/g; s/"/\\"/g')
printf 'window.__WOW_CONFIG__ = { backendUrl: "%s" };\n' "$backend_url" > /usr/share/nginx/html/runtime-config.js
