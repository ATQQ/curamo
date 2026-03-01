# Curamo - AI Content Curation Assistant

## Project Structure

This is a monorepo managed by [Bun](https://bun.sh).

```
curamo/
├── apps/
│   ├── web/          # Frontend: Vue 3 + Vite
│   └── api/          # Backend: ElysiaJS + Drizzle ORM
├── packages/         # Shared packages (optional)
└── docs/             # Documentation
```

## Getting Started

### Prerequisites

- [Bun](https://bun.sh) installed

### Installation

```bash
bun install
```

### Development

Start both frontend and backend in development mode:

```bash
bun run dev
```

- Frontend: http://localhost:5173
- Backend: http://localhost:3000

## Database

The project uses Turso (LibSQL) with Drizzle ORM.

### Schema Management

Go to `apps/api` directory:

```bash
cd apps/api
bun run drizzle-kit generate
bun run drizzle-kit migrate
```
