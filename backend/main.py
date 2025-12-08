from fastapi import FastAPI, HTTPException, Query
from pydantic import BaseModel
import uvicorn
from typing import List, Optional
import os
import psycopg2
import json
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv


app = FastAPI()

load_dotenv() 
origins = os.environ.get("FRONTEND_ORIGINS", "").split(",")

print("Loaded origins:", os.environ.get("FRONTEND_ORIGINS"))


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # list of allowed origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Database connection setup (PostgreSQL example)
def get_db_conn():
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", 5432))
    )

# Models for POST endpoints
class LoadStats(BaseModel):
    node_id: str
    cpu_load: float
    memory_load: float
    timestamp: Optional[str] = None

from datetime import datetime, timedelta

@app.get("/metrics/total_nodes")
def get_total_nodes(period: str = Query("day", enum=["day", "week", "month"], description="Time period: day, week, or month")):
    now = datetime.utcnow()
    if period == "day":
        since = now - timedelta(days=1)
    elif period == "week":
        since = now - timedelta(weeks=1)
    elif period == "month":
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(days=1)
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ts, value FROM metrics_scalar
                WHERE metric_name = 'total_nodes' AND ts >= %s
                ORDER BY ts ASC
                """,
                (since.isoformat(),)
            )
            rows = cur.fetchall()
            if rows:
                return {"total_nodes": [{"ts": r[0], "value": r[1]} for r in rows]}
            raise HTTPException(status_code=404, detail="No data found for period")

@app.get("/metrics/cpu_cores")
def get_cpu_cores(period: str = Query("day", enum=["day", "week", "month"], description="Time period: day, week, or month")):
    now = datetime.utcnow()
    if period == "day":
        since = now - timedelta(days=1)
    elif period == "week":
        since = now - timedelta(weeks=1)
    elif period == "month":
        since = now - timedelta(days=30)
    else:
        since = now - timedelta(days=1)
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT ts, value FROM metrics_scalar
                WHERE metric_name = 'total_cores' AND ts >= %s
                ORDER BY ts ASC
                """,
                (since.isoformat(),)
            )
            rows = cur.fetchall()
            if rows:
                return {"cpu_cores": [{"ts": r[0], "value": r[1]} for r in rows]}
            raise HTTPException(status_code=404, detail="No data found for period")
        
@app.get("/metrics/city_counts")
def get_city_counts():
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("""
                SELECT name, count, lat, long 
                FROM city_snapshots 
                WHERE ts = (SELECT MAX(ts) FROM city_snapshots)
            """)
            rows = cur.fetchall()
            return [
                {"city": r[0], "count": r[1], "lat": r[2], "lon": r[3]} for r in rows
            ]

@app.get("/metrics/country_counts")
def get_country_counts():
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute("SELECT name, count, lat, long FROM country_snapshots ORDER BY ts DESC LIMIT 1000")
            rows = cur.fetchall()
            return [
                {"country": r[0], "count": r[1], "lat": r[2], "lon": r[3]} for r in rows
            ]

@app.post("/metrics/load")
def post_load_stats(stats: LoadStats):
    # Example: insert into a table called node_load_stats
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                INSERT INTO node_load_stats (node_id, cpu_load, memory_load, ts)
                VALUES (%s, %s, %s, NOW())
                """,
                (stats.node_id, stats.cpu_load, stats.memory_load)
            )
    return {"status": "ok"}


if __name__ == "__main__":

    uvicorn.run(app, host="0.0.0.0", port=8000)