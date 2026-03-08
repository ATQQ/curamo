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

# 根据 schema 定义生成 SQL 迁移文件
bun x drizzle-kit generate

# 执行数据库迁移，应用变更
bun x drizzle-kit migrate

# 直接将 schema 变更推送到数据库（通常用于快速开发/原型）
bun x drizzle-kit push
```
