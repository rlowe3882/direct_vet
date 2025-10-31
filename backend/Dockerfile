FROM python:3.11-slim AS base

# Environment Variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    DOCUMENT_STORAGE_ROOT=/app/files

WORKDIR /app

# Install dependencies (Layer 1: rarely changes)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (Layer 2: changes often)
COPY . .

# Create non-root user and set permissions
RUN useradd --create-home --shell /bin/bash appuser && \
    mkdir -p "${DOCUMENT_STORAGE_ROOT}" /data && \
    # The entrypoint script is designed to handle chown, but ensure permissions here.
    chown -R appuser:appuser /app /data

# Set entrypoint permissions
RUN chmod +x docker-entrypoint.sh

# 🚀 BEST PRACTICE: Switch to non-root user for security
USER appuser

EXPOSE 8000

ENTRYPOINT ["./docker-entrypoint.sh"]