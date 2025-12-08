# Salad Stats Backend (FastAPI)

## Setup

1. Install dependencies:

    pip install -r requirements.txt

2. Set environment variables for PostgreSQL connection (or use a .env file):

    POSTGRES_DB=your_db
    POSTGRES_USER=your_user
    POSTGRES_PASSWORD=your_password
    POSTGRES_HOST=localhost
    POSTGRES_PORT=5432

3. Run the server:

    uvicorn main:app --reload

## Endpoints

- `GET /metrics/total_nodes` — latest total node count
- `GET /metrics/city_counts` — city node counts (with lat/lon)
- `GET /metrics/country_counts` — country node counts (with lat/lon)
- `POST /metrics/load` — submit node loading stats (see `LoadStats` model)

Edit `main.py` to add more endpoints as needed.
