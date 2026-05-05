# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FIAP Pos Tech Hackathon (IADT + SOAT) — MVP for **FIAP Secure Systems**, a fictitious company. The system receives software architecture diagrams (images or PDFs), analyzes them with AI, and produces structured technical reports covering identified components, architectural risks, and recommendations.

### Main Flow

1. Upload architecture diagram (image or PDF)
2. Process the diagram
3. Automated AI analysis
4. Generate structured technical report
5. Query processing status (Recebido → Em processamento → Analisado → Erro)

## Architecture Requirements

- **Microservices** architecture with Clean Architecture or Hexagonal Architecture per service
- Each service must have its own database and automated tests
- Communication: REST + at least one **async flow** (queue/messaging)
- Suggested minimum services: API Gateway/BFF, Upload & Orchestration Service, Processing Service, Reports Service

## AI Requirements

Must implement at least one of:
- Architectural component detection in images
- Risk classification via rules + ML
- LLM-based structured report generation (with input/output guardrails and hallucination mitigation)
- Prompt engineering-based textual analysis (with prompt validation, format constraints, response consistency evaluation)

The AI must be integrated into the system flow (not a standalone script). Must handle AI failures gracefully and persist AI results.

## Infrastructure

- Docker + Docker Compose (or Kubernetes)
- CI/CD pipeline with build, tests, and deploy stages
- Structured logging and observability

## Deliverables

- Source code with Dockerfiles and docker-compose/manifests
- CI/CD pipeline configuration
- README with: problem description, proposed architecture, solution flow, execution instructions, architecture diagram, and a **mandatory security section**
- Video demo (up to 15 minutes)
