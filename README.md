# FIAP Secure Systems — Architecture Diagram Analyzer

MVP for the FIAP Pos Tech Hackathon (IADT + SOAT). The system receives software architecture diagrams (images or PDFs), runs an AI pipeline over them, and produces a structured technical report with components, risks, and recommendations.

## Problem

Architecture review is mostly manual: a senior engineer studies a diagram, names the components, spots single points of failure or missing controls, and writes a report. This bottlenecks teams that need quick feedback on early designs. **FIAP Secure Systems** automates the first pass: upload a diagram, get a structured report you can iterate from.

## Architecture

Microservices (NestJS monorepo) communicating via REST (synchronous edges) and RabbitMQ (asynchronous AI pipeline). Each service owns its database; each service follows hexagonal architecture (`domain/`, `application/`, `infrastructure/`).

```
                       ┌─────────────────┐
   client ─── HTTP ───▶│  api-gateway    │  (port 3000)
                       │  - api key      │
                       │  - proxy        │
                       │  - swagger /docs│
                       └────────┬────────┘
                                │ HTTP
                ┌───────────────┴────────────────┐
                ▼                                ▼
       ┌────────────────┐              ┌────────────────┐
       │ upload-service │              │ report-service │
       │   (port 3001)  │              │   (port 3003)  │
       │   PG: upload   │              │   PG: report   │
       └───────┬────────┘              └────────▲───────┘
               │                                │
   publish     │ analysis.requested             │ analysis.completed
               ▼                                │  (consume)
       ┌──────────────────────────────────────────┐
       │              RabbitMQ                    │
       │   topic exchange: analysis_exchange      │
       │   keys: analysis.requested / .started    │
       │         / .completed / .failed           │
       └──────────────┬───────────────────────────┘
                      ▼ analysis.requested      ▲ analysis.{started,completed,failed}
            ┌──────────────────────┐            │
            │ processing-service   │ ───────────┘   (upload-service also consumes
            │   (port 3002)        │                 these to drive RECEBIDO →
            │  - OpenAI GPT-4o     │                 EM_PROCESSAMENTO → ANALISADO/ERRO
            │  - PDF→image (pdf2pic)                 in fiap_upload.analyses)
            │  - guardrails        │
            │  PG: processing      │
            └──────────────────────┘
```

Statuses (`fiap_upload.analyses.status`, served by `GET /status/:id`):
`RECEBIDO → EM_PROCESSAMENTO → ANALISADO` (or `ERRO` at any step).

The four services use direct `amqp-connection-manager` consumers (not NestJS `@EventPattern`), since `@nestjs/microservices@10` RMQ transport doesn't support topic-exchange bindings.

## Solution flow

1. Client `POST /api/v1/upload` (multipart/form-data, `file` field). The api-gateway validates the API key and proxies to `upload-service`.
2. `upload-service` saves the file to a shared Docker volume, persists an `analyses` row with status `RECEBIDO`, and publishes `analysis.requested` to RabbitMQ.
3. `processing-service` consumes `analysis.requested`, records its own job as `EM_PROCESSAMENTO` in `fiap_processing`, and publishes `analysis.started`. It then converts PDFs to images (pdf2pic) when needed, encodes images as base64, and calls **OpenAI GPT-4o Vision** with a Portuguese system prompt that pins the JSON schema and grounding rules.
4. The LLM response is JSON-parsed and validated by a `class-validator` DTO. Guardrails retry up to 2× with a corrective prompt if the response is not schema-compliant.
5. On success, `processing-service` publishes `analysis.completed` with the structured report; `report-service` consumes it and stores the report. On failure, `analysis.failed` is published.
6. `upload-service` listens to `analysis.started`, `analysis.completed`, and `analysis.failed` on its own queue (`analysis.lifecycle.upload.queue`) and transitions the row in `fiap_upload.analyses` accordingly — this is the source of truth that `GET /status/:id` returns.
7. Client polls `GET /api/v1/status/:id` to follow progress, then `GET /api/v1/reports/:id` once status is `ANALISADO`.

## API

Interactive Swagger UI at `/docs`, raw OpenAPI JSON at `/docs-json`. All HTTP endpoints (except `/health` and `/docs*`) require header `x-api-key: <API_KEY>`.

| Method | Path | Body / Params | Response |
|---|---|---|---|
| `POST` | `/api/v1/upload` | multipart `file` (image/* or application/pdf, ≤15MB) | `202 { analysis_id, status }` |
| `GET` | `/api/v1/status/:id` | UUID | `200 { analysis_id, status, error_reason, created_at, updated_at }` |
| `GET` | `/api/v1/reports/:id` | UUID | `200 { analysis_id, status, report, metadata, created_at, updated_at }` |
| `GET` | `/health` | – | `200 { status: "ok" }` |

`report` payload:

```json
{
  "summary": "string",
  "components": [{ "name": "...", "type": "api|database|...", "description": "...", "confidence": 0.0 }],
  "risks":      [{ "title": "...", "severity": "LOW|MEDIUM|HIGH|CRITICAL", "description": "...", "confidence": 0.0 }],
  "recommendations": [{ "title": "...", "description": "...", "priority": "LOW|MEDIUM|HIGH" }],
  "language": "pt-BR"
}
```

## Running locally

Prerequisites: Docker, Docker Compose, an OpenAI API key.

```bash
cp .env.example .env
# edit .env: set OPENAI_API_KEY and choose a real API_KEY
docker compose up --build
```

Endpoints once the stack is up:

- API gateway: <http://localhost:3000>
- Swagger UI: <http://localhost:3000/docs> (raw OpenAPI JSON at `/docs-json`)
- RabbitMQ UI: <http://localhost:15672> (user/pass from `.env`)
- Postgres: localhost:5432

Smoke test:

```bash
curl -X POST http://localhost:3000/api/v1/upload \
  -H "x-api-key: $API_KEY" \
  -F "file=@./diagram.png"
# → { "analysis_id": "…", "status": "RECEBIDO" }

curl http://localhost:3000/api/v1/status/<analysis_id> -H "x-api-key: $API_KEY"
# RECEBIDO → EM_PROCESSAMENTO → ANALISADO

curl http://localhost:3000/api/v1/reports/<analysis_id> -H "x-api-key: $API_KEY"
```

### Without Docker (dev)

```bash
npm install
# Postgres + RabbitMQ must be running and reachable from .env
npm run start:upload-service
npm run start:processing-service
npm run start:report-service
npm run start:api-gateway
```

### Tests

```bash
npm test            # unit tests (no external services)
npm run test:e2e    # end-to-end against real Postgres + RabbitMQ via Testcontainers
                    # — set OPENAI_API_KEY to also exercise the LLM happy path
```

The e2e suite spins up real Postgres and RabbitMQ containers, boots all four NestJS apps in-process against them, and drives the flow through the api-gateway over HTTP. Docker must be running. The OpenAI step is gated on `OPENAI_API_KEY` and skipped otherwise.

## Project layout

```
apps/
  api-gateway/         # HTTP entry point, API key guard, proxies, Swagger /docs
  upload-service/      # POST /upload, GET /status; consumes analysis.{started,completed,failed}
  processing-service/  # consumes analysis.requested; calls OpenAI Vision; publishes started/completed/failed
  report-service/      # consumes analysis.completed; GET /reports/:id
libs/shared/           # DTOs (events + ReportPayloadDto), enums, RabbitMQ config
test/e2e/              # Testcontainers-based end-to-end suite
infra/                 # init-databases.sh
.github/workflows/     # CI: lint, test, build smoke
docker-compose.yml
```

## Security

This MVP is built with the assumption that secrets, untrusted user content, and external LLM calls are all part of the threat model.

- **Authentication.** All `/api/v1/*` endpoints require an `x-api-key` header. The gateway rejects requests without a configured `API_KEY` instead of failing open. This is a placeholder for a real auth layer (OAuth client credentials or signed JWT).
- **Secrets handling.** No secrets are committed; `.env.example` ships placeholders only. `OPENAI_API_KEY`, DB credentials, and the API key are read from environment variables. The api-gateway redacts `x-api-key` and `authorization` headers from request logs (`pino-http` `redact`).
- **Input validation.** The upload endpoint enforces:
  - Allowed MIME types: `image/png`, `image/jpeg`, `image/jpg`, `image/webp`, `application/pdf`.
  - Max size 15 MB (Multer limit + explicit check).
  - File body validation runs in both the gateway and the upload service so the internal service is never trusted blindly.
  - All UUID path params go through `ParseUUIDPipe`.
- **AI guardrails.** The processing-service treats the LLM as an untrusted source:
  - System prompt pins a strict JSON schema and PT-BR output, and forbids inventing components ("describe only what you see").
  - LLM is called with `response_format: json_object` and `temperature: 0.2`.
  - Output is JSON-parsed, then validated with `class-validator` (`ReportPayloadDto`). On validation failure, a corrective retry prompt is sent (up to 2 retries, 60 s timeout).
  - PDF processing limits to the first 5 pages to bound LLM cost and prompt-injection surface from large documents.
  - Confidence scores are required per component / risk so consumers can filter low-certainty items.
- **Service isolation.** Each microservice has its own Postgres database (`fiap_upload`, `fiap_processing`, `fiap_report`) — a compromise of one service can't directly read another's data. Internal services (upload, processing, report) are not exposed publicly via api-gateway except through the explicit proxy routes.
- **Transport.** Internal communication runs on a private Docker network. RabbitMQ uses authenticated default user/password; in production, terminate TLS at the gateway and enable TLS on AMQP.
- **Failure handling.** `analysis.failed` events flip the analysis row to `ERRO` with a reason, so failed runs are observable instead of silently lost. RabbitMQ messages are persistent and consumers `nack` poisoned messages (no requeue) to prevent infinite retry loops.
- **Logging.** Structured JSON logs (`pino`) are emitted by every service. Sensitive request headers are redacted at the gateway.
- **What's deliberately out of scope for this MVP.** Rate limiting, mTLS between services, signed-URL upload to object storage, RBAC on reports, file content scanning (e.g. ClamAV), and quota enforcement on the OpenAI key. Each is a clear next step.

## CI/CD

`.github/workflows/ci.yml` runs three jobs:

1. **lint** — eslint over `apps/` and `libs/`.
2. **test** — `jest` against all `*.spec.ts` with Postgres + RabbitMQ service containers available.
3. **build** — `docker compose build` then a smoke test that the gateway responds on `/health`.

## Tech stack

NestJS 10 (TypeScript), TypeORM, PostgreSQL 16, RabbitMQ 3.13, OpenAI Node SDK (`gpt-4o`), `class-validator`, `pdf2pic` + Poppler, `pino`, Jest. All packaged as multi-stage `node:20-alpine` Docker images.
