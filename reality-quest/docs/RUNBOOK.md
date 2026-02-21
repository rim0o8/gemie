# Runbook

> Operational procedures for Reality Quest.

## Architecture Overview

- **Frontend**: Vite + TypeScript + Three.js (WebXR/AR)
- **Backend**: Bun server (`server/src/index.ts`)
- **Database**: PostgreSQL 16 (Docker)
- **AI**: Google Gemini API (Live + Text models)

## Deployment

### Prerequisites

- Bun installed on the server
- Docker and Docker Compose for PostgreSQL
- Google API key configured

### Steps

1. Install dependencies:

```bash
bun install --frozen-lockfile
```

2. Start the database:

```bash
bun run db:up
```

3. Build the frontend:

```bash
bun run build
```

4. Start the server:

```bash
bun run start:server
```

The server listens on the port defined by `PORT` (default: `8787`).

### Preview Mode

For quick validation before full deployment:

```bash
bun run preview
```

## Database

### Connection

```
postgres://postgres:postgres@localhost:54329/gemie
```

- Container name: `gemie-postgres`
- Image: `postgres:16-alpine`
- Port mapping: `54329 -> 5432`
- Init script: `server/db/init.sql` (runs on first start)
- Data volume: `postgres_data`

### Start / Stop

```bash
bun run db:up    # Start PostgreSQL
bun run db:down  # Stop and remove containers
```

### Reset Database

```bash
bun run db:down
docker volume rm reality-quest_postgres_data
bun run db:up
```

## Monitoring and Health Checks

### Application Logs

```bash
# Frontend dev server
bun run dev

# Backend server (watch mode for development)
bun run dev:server

# Backend server (production)
bun run start:server
```

### Database Logs

```bash
docker logs gemie-postgres
docker logs -f gemie-postgres  # Follow
```

## Common Issues and Fixes

### Port already in use

```
Error: listen EADDRINUSE :::8787
```

**Fix**: Kill the process using the port or change `PORT` in `.env`.

```bash
lsof -i :8787
kill -9 <PID>
```

### Database connection refused

```
Error: connect ECONNREFUSED 127.0.0.1:54329
```

**Fix**: Ensure PostgreSQL container is running.

```bash
bun run db:up
docker ps  # Verify container status
```

### Missing API key

```
ZodError: VITE_GOOGLE_API_KEY is required
```

**Fix**: Set `VITE_GOOGLE_API_KEY` and `GOOGLE_API_KEY` in `.env`.

### Docker volume issues on init.sql changes

The init script only runs on the first container start. If `server/db/init.sql` is updated:

```bash
bun run db:down
docker volume rm reality-quest_postgres_data
bun run db:up
```

### Build fails with type errors

```bash
bun run typecheck  # See detailed errors
```

## Rollback Procedures

### Application Rollback

1. Identify the last known good commit:

```bash
git log --oneline -10
```

2. Check out the previous version:

```bash
git checkout <commit-hash>
```

3. Rebuild and restart:

```bash
bun install --frozen-lockfile
bun run build
bun run start:server
```

### Database Rollback

PostgreSQL data persists in the `postgres_data` Docker volume. For a full reset, remove the volume and reinitialize (see "Reset Database" above).

## Quality Gate

Before any deployment, run the full quality gate:

```bash
bun run check
```

This runs: `format:check` -> `lint` -> `typecheck` -> `test:coverage`

All checks must pass before deployment.
