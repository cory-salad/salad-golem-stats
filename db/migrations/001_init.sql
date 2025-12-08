-- ===============================================
-- 001_init.sql
-- Initial database schema for metrics dashboard
-- ===============================================

-- -----------------------
-- 1. Scalars (time-series)
-- -----------------------
CREATE TABLE IF NOT EXISTS metrics_scalar (
    ts TIMESTAMP NOT NULL,
    metric_name TEXT NOT NULL,
    value FLOAT,
    PRIMARY KEY (ts, metric_name)
);

-- Optional index for faster time-range queries
CREATE INDEX IF NOT EXISTS idx_metrics_scalar_ts
ON metrics_scalar(ts);

-- -----------------------
-- 2. GPU snapshots
-- -----------------------

CREATE TABLE  IF NOT EXISTS gpu_snapshots (
    ts TIMESTAMP PRIMARY KEY,
    counts_by_name JSONB NOT NULL,    -- {"3090": 5, "3090 Ti": 2}
    counts_by_vram JSONB NOT NULL,    -- {"8GB": 10, "24GB": 7}
    running_by_name JSONB NOT NULL,   -- {"3090": 3, "3090 Ti": 2}
    running_by_vram JSONB NOT NULL    -- {"8GB": 6, "24GB": 5}
);

-- Optional GIN index to allow JSON queries inside counts
CREATE INDEX IF NOT EXISTS idx_gpu_counts_by_name_gin
ON gpu_snapshots USING GIN (counts_by_name);

CREATE INDEX IF NOT EXISTS idx_gpu_counts_by_vram_gin
ON gpu_snapshots USING GIN (counts_by_vram);

CREATE INDEX IF NOT EXISTS idx_gpu_running_by_name_gin
ON gpu_snapshots USING GIN (running_by_name);

CREATE INDEX IF NOT EXISTS idx_gpu_running_by_vram_gin
ON gpu_snapshots USING GIN (running_by_vram);

-- -----------------------
-- 3. Latest-only metrics (e.g., cities/countries)
-- -----------------------
CREATE TABLE IF NOT EXISTS city_snapshots (
    ts TIMESTAMP NOT NULL,
    name TEXT NOT NULL,
    count INTEGER NOT NULL,
    lat FLOAT NOT NULL,
    long FLOAT NOT NULL,
    PRIMARY KEY (ts, name)
);

CREATE TABLE IF NOT EXISTS country_snapshots (
    ts TIMESTAMP NOT NULL,
    name TEXT NOT NULL,
    count INTEGER NOT NULL,
    lat FLOAT NOT NULL,
    long FLOAT NOT NULL,
    PRIMARY KEY (ts, name)
);
