FROM python:3.11-slim

ENV DEBIAN_FRONTEND=noninteractive \
  PYTHONUNBUFFERED=1 \
  PYTHONDONTWRITEBYTECODE=1

WORKDIR /app

# Basic system deps needed by some Python wheels (opencv-headless, pillow, etc.)
RUN apt-get update && \
  apt-get install -y --no-install-recommends \
  build-essential \
  gcc \
  libglib2.0-0 \
  libsm6 \
  libxrender1 \
  libxext6 \
  curl \
  && rm -rf /var/lib/apt/lists/*

# Install Python deps
COPY requirements.txt .
RUN pip install --upgrade pip setuptools wheel && \
  pip install --no-cache-dir -r requirements.txt

# Copy app source
COPY . /app
RUN mkdir -p /app/models

# Create non-root user
RUN groupadd -r appgroup && useradd -r -g appgroup appuser && chown -R appuser:appgroup /app
USER appuser

EXPOSE 8000

# adjust the module path if your FastAPI app is in a submodule (e.g., app.main)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
