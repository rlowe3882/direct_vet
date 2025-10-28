#!/usr/bin/env bash
set -euo pipefail

APP_USER=${APP_USER:-appuser}
APP_GROUP=${APP_GROUP:-appuser}
DOCUMENT_STORAGE_ROOT=${DOCUMENT_STORAGE_ROOT:-/app/files}
SQLITE_DATA_DIR=${SQLITE_DATA_DIR:-/data}

create_schema() {
  python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
}

seed_reference_data() {
  python -m app.seed_states
}

start_server() {
  exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port \"${PORT:-8000}\" \
    --proxy-headers \
    --forwarded-allow-ips \"*\"
}

prepare_paths() {
  mkdir -p \"${DOCUMENT_STORAGE_ROOT}\" \"${SQLITE_DATA_DIR}\"
  if command -v chown >/dev/null 2>&1; then
    chown -R \"${APP_USER}:${APP_GROUP}\" \"${DOCUMENT_STORAGE_ROOT}\" \"${SQLITE_DATA_DIR}\" 2>/dev/null || true
  fi
}

if [ \"$(id -u)\" -eq 0 ]; then
  prepare_paths
  if id -u \"${APP_USER}\" >/dev/null 2>&1; then
    su -s /bin/bash \"${APP_USER}\" -c \"$(declare -f create_schema seed_reference_data); set -e; create_schema; seed_reference_data\"
    exec su -s /bin/bash \"${APP_USER}\" -c \"$(declare -f start_server); set -e; start_server\"
  else
    create_schema
    seed_reference_data
    start_server
  fi
else
  prepare_paths
  create_schema
  seed_reference_data
  start_server
fi
