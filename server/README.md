# Invictus AI — Backend Server

## Prerequisites

- Python 3.12+
- Docker & Docker Compose

## Setup

```bash
# Start PostgreSQL and Redis
docker compose up -d

# Create virtual environment and install
python -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"

# Copy env file
cp .env.example .env

# Create DB schemas and run migrations
python scripts/create_schemas.py
alembic upgrade head

# Seed test data
python scripts/seed.py

# Start the server
uvicorn app.main:app --reload --port 8000

# Start Celery worker (separate terminal)
celery -A app.tasks.celery_app worker --loglevel=info -Q default,email
```

## API Docs

- Swagger UI: http://localhost:8000/docs
- ReDoc: http://localhost:8000/redoc
