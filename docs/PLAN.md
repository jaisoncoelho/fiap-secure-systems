# Hackathon MVP — Architecture Diagram Analyzer (NestJS)

## Context

FIAP Pos Tech Hackathon (IADT + SOAT). Build a backend MVP that receives software architecture diagrams (image/PDF), analyzes them with AI, and produces structured technical reports (components, risks, recommendations). Greenfield project.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Language | TypeScript |
| Framework | NestJS |
| Messaging | RabbitMQ (via `@nestjs/microservices` + `amqplib`) |
| Database | PostgreSQL 16 |
| ORM | TypeORM |
| AI | OpenAI GPT-4o (Vision API) |
| File Storage | Shared Docker volume |
| Testing | Jest (built-in NestJS) |
| CI/CD | GitHub Actions |
| Logging | NestJS built-in Logger + `nestjs-pino` (structured JSON) |
| Validation | class-validator + class-transformer |

---

## Microservices (NestJS monorepo mode)

Using `nest g app <name>` monorepo structure with shared libraries.

### 1. `api-gateway` (port 3000)
- Single HTTP entry point, proxies to internal services
- API key guard placeholder
- Health check endpoint

### 2. `upload-service` (port 3001)
- `POST /upload` — receives file (image/PDF via Multer), validates, saves to shared volume, creates DB record `RECEBIDO`, publishes `analysis.requested` to RabbitMQ
- `GET /status/:id` — returns processing status (source of truth: `fiap_upload.analyses`)
- Owns the user-visible lifecycle: consumes `analysis.started`, `analysis.completed`, `analysis.failed` on `analysis.lifecycle.upload.queue` and transitions the row to `EM_PROCESSAMENTO`, `ANALISADO`, or `ERRO`

### 3. `processing-service` (port 3002)
- Consumes `analysis.requested` from RabbitMQ
- Records its own job as `EM_PROCESSAMENTO` in `fiap_processing` and publishes `analysis.started`
- Runs AI pipeline (OpenAI Vision)
- On success: publishes `analysis.completed` with the report payload
- On failure: publishes `analysis.failed`

### 4. `report-service` (port 3003)
- Consumes `analysis.completed` and persists the structured report in `fiap_report.reports`
- `GET /reports/:id` — returns the persisted report

---

## Async Flow

```
Client → api-gateway → upload-service → [save file, DB: RECEBIDO]
                                        → publish analysis.requested → RabbitMQ
                                                                        ↓
                                                              processing-service
                                                              [DB(processing): EM_PROCESSAMENTO]
                                                              ─ publish analysis.started ───────► RabbitMQ ──► upload-service
                                                                                                              [DB(upload): EM_PROCESSAMENTO]
                                                              [call OpenAI Vision API]
                                                                        ↓
                                            success: publish analysis.completed ─► RabbitMQ ──► report-service
                                                                                                [save report]
                                                                                  ──► upload-service
                                                                                       [DB(upload): ANALISADO]
                                            failure: publish analysis.failed   ─► RabbitMQ ──► upload-service
                                                                                                [DB(upload): ERRO]
```

RabbitMQ: topic exchange `analysis_exchange`. Queues are owned per consumer (no shared queues):
- `analysis.requested.processing.queue` — bound to `analysis.requested` (processing-service)
- `analysis.completed.report.queue` — bound to `analysis.completed` (report-service)
- `analysis.lifecycle.upload.queue` — bound to `analysis.started`, `analysis.completed`, `analysis.failed` (upload-service)

Consumers use `amqp-connection-manager` directly (with explicit `assertExchange` + `assertQueue` + `bindQueue` + `consume`), not `@nestjs/microservices` `@EventPattern`. The Nest 10 RMQ transport's `ServerRMQ` does not support exchange bindings — it only does `assertQueue` + `consume`, so messages routed via a topic exchange never reach the queue.

---

## Project Structure (NestJS Monorepo)

```
hackaton/
├── docker-compose.yml
├── .github/workflows/ci.yml
├── README.md
├── CLAUDE.md
├── nest-cli.json
├── package.json
├── tsconfig.json
├── docs/
├── infra/
│   └── init-databases.sh
├── libs/
│   └── shared/
│       └── src/
│           ├── dto/                # Shared DTOs (analysis request/response, report)
│           ├── entities/           # Shared base entity
│           ├── enums/
│           │   └── analysis-status.enum.ts  # RECEBIDO, EM_PROCESSAMENTO, ANALISADO, ERRO
│           ├── messaging/
│           │   └── rabbitmq.config.ts
│           └── index.ts
├── apps/
│   ├── api-gateway/
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── upload/
│   │       │   └── upload.controller.ts    # Proxy to upload-service
│   │       ├── reports/
│   │       │   └── reports.controller.ts   # Proxy to report-service
│   │       └── guards/
│   │           └── api-key.guard.ts
│   ├── upload-service/
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── domain/
│   │       │   ├── entities/
│   │       │   │   └── analysis.entity.ts
│   │       │   └── enums/
│   │       ├── application/
│   │       │   ├── ports/
│   │       │   │   ├── analysis.repository.port.ts
│   │       │   │   └── message.publisher.port.ts
│   │       │   └── use-cases/
│   │       │       ├── upload-diagram.use-case.ts
│   │       │       └── get-status.use-case.ts
│   │       └── infrastructure/
│   │           ├── controllers/
│   │           │   └── upload.controller.ts
│   │           ├── persistence/
│   │           │   ├── analysis.orm-entity.ts
│   │           │   └── analysis.repository.ts
│   │           └── messaging/
│   │               └── rabbitmq.publisher.ts
│   ├── processing-service/
│   │   └── src/
│   │       ├── main.ts
│   │       ├── app.module.ts
│   │       ├── domain/
│   │       │   └── entities/
│   │       │       └── processing-result.entity.ts
│   │       ├── application/
│   │       │   ├── ports/
│   │       │   │   ├── ai-analyzer.port.ts
│   │       │   │   └── message.publisher.port.ts
│   │       │   └── use-cases/
│   │       │       └── analyze-diagram.use-case.ts
│   │       └── infrastructure/
│   │           ├── ai/
│   │           │   ├── openai.adapter.ts
│   │           │   ├── prompts.ts
│   │           │   └── guardrails.ts
│   │           ├── messaging/
│   │           │   ├── consumer.controller.ts
│   │           │   └── rabbitmq.publisher.ts
│   │           └── persistence/
│   │               └── processing.repository.ts
│   └── report-service/
│       └── src/
│           ├── main.ts
│           ├── app.module.ts
│           ├── domain/
│           │   └── entities/
│           │       └── report.entity.ts
│           ├── application/
│           │   ├── ports/
│           │   │   └── report.repository.port.ts
│           │   └── use-cases/
│           │       ├── save-report.use-case.ts
│           │       └── get-report.use-case.ts
│           └── infrastructure/
│               ├── controllers/
│               │   └── report.controller.ts
│               ├── persistence/
│               │   ├── report.orm-entity.ts
│               │   └── report.repository.ts
│               └── messaging/
│                   └── consumer.controller.ts
```

**Hexagonal architecture per service**:
- `domain/` — Entities, value objects (no NestJS imports)
- `application/ports/` — Abstract interfaces
- `application/use-cases/` — Business logic, depends only on ports
- `infrastructure/` — NestJS controllers, TypeORM repos, RabbitMQ adapters, OpenAI adapter

---

## AI Pipeline (processing-service)

1. **File prep**: PDF → images via `pdf-parse` + `sharp`; images used directly; encode base64
2. **Prompt**: system prompt with role, JSON output schema, grounding rules ("only describe what you see"), language PT-BR
3. **LLM call**: OpenAI GPT-4o with `response_format: { type: "json_object" }`
4. **Guardrails**: validate response with class-validator DTO; retry once with corrective prompt on failure; 60s timeout, 2 retries max
5. **Hallucination mitigation**: prompt requires confidence scores, flags uncertain items
6. **Output**: `{ summary, components[], risks[], recommendations[] }` + metadata

---

## API Contracts

**POST /api/v1/upload** → `202 { analysis_id, status: "RECEBIDO" }`
**GET /api/v1/status/:id** → `200 { analysis_id, status, error_reason, created_at, updated_at }`
**GET /api/v1/reports/:id** → `200 { analysis_id, status, report: { summary, components[], risks[], recommendations[], language }, metadata, created_at, updated_at }`

Interactive contract / try-it-out: `GET /docs` (Swagger UI), `GET /docs-json` (raw OpenAPI 3 document). Both unauthenticated.

---

## Infrastructure

**docker-compose.yml**: rabbitmq, postgres (init script for 3 DBs), 4 NestJS apps, shared uploads volume.

**Dockerfiles**: `node:20-alpine`, multi-stage build (build → production). Processing-service adds poppler-utils.

**CI/CD** (`.github/workflows/ci.yml`):
- `lint`: eslint
- `test`: jest per app with postgres/rabbitmq service containers
- `build`: docker compose build + smoke test health endpoints

---

## Implementation Order

| Step | What |
|---|---|
| 1 | Scaffold NestJS monorepo + docker-compose + infra |
| 2 | Shared library (DTOs, enums, RabbitMQ config) |
| 3 | upload-service (domain, ports, use-cases, controllers, DB, messaging) |
| 4 | processing-service + AI pipeline (OpenAI adapter, prompts, guardrails) |
| 5 | report-service (consumer, DB, controller) |
| 6 | api-gateway (proxy controllers, API key guard) |
| 7 | Tests per service |
| 8 | CI/CD pipeline |
| 9 | README + security section |

---

## Verification

1. `docker compose up --build` — all services start healthy
2. `curl -X POST /api/v1/upload -F file=@diagram.png` → `202 { analysis_id, status }`
3. Poll `GET /api/v1/status/:id` → RECEBIDO → EM_PROCESSAMENTO → ANALISADO
4. `GET /api/v1/reports/:id` → structured report
5. Upload invalid file → `400`
6. `npm test` passes in each app
7. GitHub Actions workflow passes
