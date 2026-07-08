# Codoctor backend — portable container image.
# Runs identically on Azure App Service (containers), Azure Container Apps, or locally.
# For no cold start on Azure App Service, enable "Always On" (B1 plan or higher).
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

# Install deps first so Docker layer-caches them across code changes.
COPY requirements.txt ./
RUN pip install --upgrade pip && pip install -r requirements.txt

COPY . .

# Azure App Service injects the port to listen on via $PORT (App Service sets
# WEBSITES_PORT / PORT; default to 8000 for local `docker run`).
ENV PORT=8000
EXPOSE 8000

# Shell form so $PORT expands at runtime.
CMD python -m uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
