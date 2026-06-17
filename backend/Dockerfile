FROM python:3.12-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

RUN apt-get update && apt-get install -y --no-install-recommends \
        build-essential \
        gdal-bin \
        libgdal-dev \
        libgeos-dev \
        libproj-dev \
        libspatialindex-dev \
        proj-bin \
        proj-data \
        curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt ./
RUN pip install --upgrade pip \
 && pip install -r requirements.txt \
 && pip install gunicorn

COPY backend/ ./

RUN useradd --create-home --shell /bin/bash app \
 && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "--workers", "3", "metro.wsgi:application"]
