# Yellow November Backend

Fastify 5 + TypeScript + Drizzle ORM + mysql2 backend for the Yellow November storefront. This is a modular monolith organized around the frontend commerce contract.

## Assumptions

The initial adapter targets self-hosted or dedicated TiDB over the MySQL wire protocol using a pooled `mysql2` connection. Confirm the TiDB deployment mode before production; TiDB Cloud Serverless requires an HTTP adapter instead.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm db:generate
pnpm db:migrate
pnpm dev
```

The API listens on `http://localhost:4000` by default. Point the frontend `NEXT_PUBLIC_API_URL` at that URL.

## Auditing

Every important state change is written to the immutable `audit_logs` table. Records include the actor user and role when authenticated, request ID, IP address, user agent, action, entity type and ID, sanitized before/after snapshots, metadata, and creation timestamp. Passwords, tokens, cookies, and authorization values are redacted before persistence.

Covered events include customer signup, successful and failed login, product create/update/archive, category create/update/delete, inventory adjustments, order creation, order status changes, and bulk-enquiry creation. Audit rows are append-only from application code; there is no normal update or delete endpoint.

Administrators can query the audit trail with `GET /admin/audit-logs` and `GET /admin/audit-logs/:id`. Supported query parameters are `page`, `pageSize`, `action`, `entityType`, `actorUserId`, `entityId`, `search`, `from`, and `to`. Results are newest first and include `hasMore` for pagination. Access requires the administrator role.

Apply both audit migrations with `pnpm db:migrate` before starting the API. The first creates the table; the second adds indexes for time, actor, entity, and action filtering.

## Architecture

Routes/controllers live in `src/modules/*/routes.ts`, business rules are kept in services, and only repositories import Drizzle. Cross-cutting concerns live in `src/plugins`.

## Endpoints

- `GET /health/live`, `GET /health/ready`, `GET /metrics`
- `POST /auth/customer/login`, `POST /auth/customer/signup`, `POST /auth/admin/login`
- `GET /catalog/products`, `GET /catalog/products/:slug`
- `GET/POST/PATCH/DELETE /admin/categories`
- `GET/POST/PATCH/DELETE /admin/products`
- `GET /admin/inventory`, `POST /admin/inventory/adjustments`
- `GET/POST/PATCH/DELETE /cart/items`
- `GET/POST /orders`, `GET /orders/:orderNumber`
- `GET/POST/DELETE /saved-products`
- `POST /bulk-enquiries`
- `GET /admin/audit-logs`, `GET /admin/audit-logs/:id`

All errors use `{ code, message, details }`. Mutating order creation accepts an `Idempotency-Key` header.


## Module layout

Each bounded context follows the same debugging path:

```text
src/modules/<domain>/
  model.ts       # domain-owned persistence model exports
  controller.ts  # validation, orchestration, and HTTP handlers
  route.ts       # thin Fastify route registration
```

The current contexts are `auth`, `catalog`, `categories`, `products`, `inventory`, `saved`, `cart`, `orders`, `bulk`, and `audit`. The audit context is split into `src/modules/audit/service.ts`, `controller.ts`, and `route.ts`.

Shared layers are separated as follows:

```text
src/config/       # environment validation and domain constants
src/db/           # Drizzle schema, client, and migrations
src/shared/       # reusable query/service helpers and response mapping
src/plugins/      # auth, security, rate limit, error handling, health, metrics
src/routes.ts     # composition root only; registers module routes
```

For a request, start at `src/modules/<domain>/route.ts`, follow it to the controller, then inspect `src/shared/context.ts` and the domain model/schema. Database access is centralized through the Drizzle client and schema files.
