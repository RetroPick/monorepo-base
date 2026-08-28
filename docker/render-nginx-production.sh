#!/bin/sh
set -eu

: "${API_HOST:?API_HOST is required}"
API_UPSTREAM="${API_UPSTREAM:-markets-api:8080}"

template="/etc/nginx/templates/default.conf.template"
output="/etc/nginx/conf.d/default.conf"

ALL_SERVER_NAMES="${API_HOST}"
APP_SERVER_BLOCK=""

if [ -n "${APP_HOST:-}" ]; then
  ALL_SERVER_NAMES="${ALL_SERVER_NAMES} ${APP_HOST}"
  APP_SERVER_BLOCK=$(cat <<EOF
server {
  listen 443 ssl http2;
  server_name ${APP_HOST};

  ssl_certificate /etc/letsencrypt/live/${APP_HOST}/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/${APP_HOST}/privkey.pem;

  location / {
    proxy_pass http://markets-web:3001;
    proxy_http_version 1.1;
    proxy_set_header Host \$host;
    proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto \$scheme;
  }
}
EOF
)
fi

export API_HOST API_UPSTREAM APP_SERVER_BLOCK ALL_SERVER_NAMES
envsubst '${API_HOST} ${API_UPSTREAM} ${APP_SERVER_BLOCK} ${ALL_SERVER_NAMES}' < "${template}" > "${output}"
exec nginx -g 'daemon off;'
