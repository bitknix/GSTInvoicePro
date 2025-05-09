FROM python:3.10-slim AS builder

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
RUN pip install gunicorn

# Create non-root user
RUN adduser --disabled-password --gecos "" appuser

# Production stage
FROM python:3.10-slim

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    curl \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /usr/local/lib/python3.10/site-packages /usr/local/lib/python3.10/site-packages
COPY --from=builder /usr/local/bin/gunicorn /usr/local/bin/gunicorn
COPY --from=builder /usr/local/bin/uvicorn /usr/local/bin/uvicorn

# Copy the non-root user
COPY --from=builder /etc/passwd /etc/passwd

# Copy the rest of the application
COPY . .

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PORT=8000 \
    HOST=0.0.0.0 \
    DEBUG=false \
    PYTHONDONTWRITEBYTECODE=1

# Set ownership to appuser
RUN chown -R appuser:appuser /app
USER appuser

# Expose the port
EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/api/v1/health || exit 1

# Run the application with Gunicorn
CMD ["gunicorn", "--workers", "4", "--worker-class", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "app.main:app"] 