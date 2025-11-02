#!/usr/bin/env bash
# Ensures that the script exits immediately if any command fails.
set -euo pipefail

# --- Configuration (Keep these at the top) ---
APP_USER=${APP_USER:-appuser}
APP_GROUP=${APP_GROUP:-appuser}
DOCUMENT_STORAGE_ROOT=${DOCUMENT_STORAGE_ROOT:-/app/files}

# --- Database Schema Management (Keep these definitions together) ---

create_schema() {
  python -c "from app.database import Base, engine; Base.metadata.create_all(bind=engine)"
}

seed_reference_data() {
  python -m app.seed_states
}

start_server() {
  exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port "${PORT:-8000}" \
    --proxy-headers \
    --forwarded-allow-ips "*"
}

prepare_paths() {
  mkdir -p "${DOCUMENT_STORAGE_ROOT}"
  if command -v chown >/dev/null 2>&1; then
    chown -R "${APP_USER}:${APP_GROUP}" "${DOCUMENT_STORAGE_ROOT}" 2>/dev/null || true
  fi
}

wait_for_database() {
  python <<'PY'
import os
import sys
import time

from sqlalchemy import create_engine, text
from sqlalchemy.exc import OperationalError

database_url = os.getenv("DATABASE_URL")
if not database_url:
    sys.exit("DATABASE_URL is not set.")

engine = create_engine(database_url, future=True, pool_pre_ping=True)
print("Waiting for database to be ready...")

for attempt in range(30):
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        print("Database connection successful.")
        break
    except OperationalError as e:
        if attempt < 29:
            time.sleep(1)
        else:
            print(f"Database is not ready after waiting for 30 seconds: {e}")
            sys.exit(1)
PY
}

# --- The function that executes the full setup sequence ---
bootstrap_database() {
  wait_for_database
  create_schema # Creates tables (must run before seeding)
  seed_reference_data # Populates data (must run after schema is created)
}

# --- Main Execution Flow (The corrected logic) ---

# 1. Check for a special command argument.
# This handles the call from the new 'migrations' service in docker-compose.yml.
# If the argument is 'bootstrap_database', we run the setup and immediately exit.
if [[ "${1:-}" == "bootstrap_database" ]]; then
  # If running as root, switch user to run the bootstrap, then exit.
  if [ "$(id -u)" -eq 0 ] && id -u "${APP_USER}" >/dev/null 2>&1; then
    FUNCTIONS=$(declare -f wait_for_database create_schema seed_reference_data bootstrap_database)
    exec su -s /bin/bash "${APP_USER}" -c "${FUNCTIONS}; set -e; bootstrap_database"
  else
    # Run directly (if already non-root, or if root without appuser)
    bootstrap_database
  fi
  exit 0
fi

# 2. Normal Server Startup Path (Only reached if no 'bootstrap_database' argument is passed)

# If running as root (i.e., Dockerfile didn't use 'USER appuser' or it's an override)
if [ "$(id -u)" -eq 0 ]; then
  prepare_paths # Run as root to correctly chown volumes
  
  if id -u "${APP_USER}" >/dev/null 2>&1; then
    # Switch to non-root user and EXECUTE the server start
    exec su -s /bin/bash "${APP_USER}" -c "exec start_server"
  else
    # Fallback if non-root user doesn't exist (should not happen)
    start_server
  fi
else
  # If running as a non-root user (due to Dockerfile USER directive)
  prepare_paths
  start_server
fi
