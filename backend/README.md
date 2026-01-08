# Salad Stats Backend

TypeScript/Node.js API built with Fastify.

## Development

```bash
npm install
npm run dev
```

## Production

```bash
npm run build
npm start
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8000` | Server port |
| `POSTGRES_HOST` | `localhost` | Database host |
| `POSTGRES_PORT` | `5432` | Database port |
| `POSTGRES_DB` | `statsdb` | Database name |
| `POSTGRES_USER` | `devuser` | Database user |
| `POSTGRES_PASSWORD` | `devpass` | Database password |
| `REDIS_HOST` | `localhost` | Redis host |
| `REDIS_PORT` | `6379` | Redis port |
| `REDIS_DB` | `0` | Redis database |
| `FRONTEND_ORIGINS` | `http://localhost:5173` | CORS allowed origins |
| `CACHE_TTL_GEO` | `86400` | Geo endpoint cache TTL (seconds) |
| `CACHE_TTL_TRANSACTIONS` | `60` | Transactions endpoint cache TTL |
| `CACHE_TTL_PLAN_STATS` | `3600` | Plan stats endpoint cache TTL |

## API Endpoints

- `GET /metrics/plans` - Plan metrics with time series
- `GET /metrics/geo_counts` - H3 hexagon aggregated geo data
- `GET /metrics/transactions` - Paginated transactions
