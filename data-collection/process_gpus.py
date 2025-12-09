import sys
import os
from collections import Counter
from datetime import datetime, timedelta, timezone
import requests
import time
import json
import csv
from pathlib import Path
from pymongo import MongoClient
from dotenv import load_dotenv
import psycopg2

# Database connection setup (PostgreSQL example)
def get_db_conn():
    return psycopg2.connect(
        dbname=os.getenv("POSTGRES_DB"),
        user=os.getenv("POSTGRES_USER"),
        password=os.getenv("POSTGRES_PASSWORD"),
        host=os.getenv("POSTGRES_HOST", "localhost"),
        port=int(os.getenv("POSTGRES_PORT", 5432))
    )

def main():
    # Load .env variables
    load_dotenv()  # reads .env from current directory


        with conn:
        with conn.cursor() as cur:
            cur.execute(
                """
                SELECT gpu_snapshots (ts, counts_by_name, running_by_name, counts_by_vram, running_by_vram)
                VALUES (%s, %s, %s, %s, %s)
                ON CONFLICT (ts) DO UPDATE
                SET counts_by_name = EXCLUDED.counts_by_name,
                    running_by_name = EXCLUDED.running_by_name,
                    counts_by_vram = EXCLUDED.counts_by_vram,
                    running_by_vram = EXCLUDED.running_by_vram
                """,
                (
                    ts,
                    json.dumps(gpu_counter),
                    json.dumps(running_gpu_counter),
                    json.dumps(vram_counter),
                    json.dumps(running_vram_counter)
                )
            )


            @app.get("/metrics/total_cpu_cores")
def get_total_cpu_cores(period: str = Query("day", enum=["day", "week", "month"], description="Time period: day, week, or month")):
    return get_metric_trend("total_cores", "total_cpu_cores", period)


def get_metric_trend(metric_name, response_key, period):
    now = datetime.utcnow()
    if period == "day":
        since = now - timedelta(days=365)
    elif period == "week":
        since = now - timedelta(weeks=365)
    elif period == "month":
        since = now - timedelta(days=365)
    else:
        since = now - timedelta(days=365)
    with get_db_conn() as conn:
        with conn.cursor() as cur:
            cur.execute(
                f"""
                SELECT ts, value FROM gpu_snapshots
                WHERE metric_name = %s AND ts >= %s
                ORDER BY ts ASC
                """,
                (metric_name, since.isoformat())
            )
            rows = cur.fetchall()
            if rows:
                return {response_key: [{"ts": r[0], "value": r[1]} for r in rows]}
            raise HTTPException(status_code=404, detail=f"No data found for {metric_name}")