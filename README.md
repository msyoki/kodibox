# Kodibox

Rent & property management for Kenya. Kodibox collects rent straight into the landlord's own M-Pesa paybill/till or bank account, reconciles it automatically, keeps an auditable ledger and gives tenants a self-service portal. Kodibox never holds client funds.

## Documentation

| Doc                                                    | Purpose                                                |
| ------------------------------------------------------ | ------------------------------------------------------ |
| [docs/PROJECT_PLAN.md](docs/PROJECT_PLAN.md)           | Vision, phases, task IDs, metrics, risks               |
| [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)           | System design and payment flows                        |
| [docs/DATA_MODEL.md](docs/DATA_MODEL.md)               | Schema and double-entry ledger rules                   |
| [docs/SECURITY.md](docs/SECURITY.md)                   | Threat model and mandatory controls                    |
| [docs/PRIVACY_BY_DESIGN.md](docs/PRIVACY_BY_DESIGN.md) | Data Protection Act 2019 implementation                |
| [docs/MOBILE_APP_PLAN.md](docs/MOBILE_APP_PLAN.md)     | Mobile app (Expo) plan                                 |
| [docs/design/](docs/design/)                           | UI frames (35 screens, web + mobile) and design tokens |
| [docs/research/](docs/research/)                       | Bomahut teardown, Kenyan legal research                |
| [docs/adr/](docs/adr/)                                 | Architecture decision records                          |
| [docs/CLAUDE_WORKFLOW.md](docs/CLAUDE_WORKFLOW.md)     | Developing with Claude Code agents & skills            |
| [CLAUDE.md](CLAUDE.md)                                 | Rules Claude Code follows in this repo                 |

## Getting started

Requirements: Node 22, pnpm 10, Docker.

```bash
cp .env.example .env          # set POSTGRES_PORT=5433 if 5432 is reserved on Windows
docker compose up -d          # postgres, redis, mailpit
pnpm install
pnpm dev                      # web on http://localhost:3000, plus the worker
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

Development follows [docs/DEV_PLAN.md](docs/DEV_PLAN.md). In Claude Code, run `/next-task`.

> Legal notice: the compliance documents are research notes, not legal advice. A Kenyan advocate must review them before launch (task L-01).
