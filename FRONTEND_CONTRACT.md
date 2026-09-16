# Frontend Integration Contract

Set the frontend `NEXT_PUBLIC_API_URL` to the backend origin, for example `http://localhost:4000`. The frontend API wrapper sends the JWT from `localStorage.yn_token` as a bearer token.

## Authentication

| Method | Route | Access |
|---|---|---|
| POST | `/auth/customer/signup` | Public |
| POST | `/auth/customer/login` | Public |
| POST | `/auth/admin/login` | Public |

Authentication responses return `{ token, user }`. Customer and admin authorization are separate roles.

## Catalogue and admin products

| Method | Route | Access |
|---|---|---|
| GET | `/catalog/products` | Public |
| GET | `/catalog/products/:slug` | Public |
| GET | `/admin/products` | Admin |
| POST | `/admin/products` | Admin |
| PATCH | `/admin/products/:id` | Admin |
| DELETE | `/admin/products/:id` | Admin |

Catalogue supports `search`, `category`, `featured`, `bulk`, `page`, and `pageSize`. The default response remains an array for compatibility with the current frontend; pagination parameters are accepted and applied. `GET /catalog/categories` returns active categories for public filters. Clients request one extra record (`pageSize + 1`) to determine whether another page exists.

## Categories

`GET/POST /admin/categories`, `PATCH/DELETE /admin/categories/:id`. Category names are accepted by the product editor and resolved to category IDs by the backend. `GET /admin/users` supports `search`, `page`, and `pageSize`; `PATCH /admin/users/:id` accepts `active` or `suspended` status and returns customer-safe fields only.

## Inventory

`GET /admin/inventory` supports product/variant/SKU search, availability status filtering, and pagination. Its response includes `{ items, total, page, pageSize, movements }`. `POST /admin/inventory/adjustments` supports `receive`, `adjust`, `damage`, and `return` movements with pack and loose-piece deltas. Negative inventory is rejected.

## Saved products

`GET/POST/DELETE /saved-products` requires customer authentication. The GET response returns `{ ids, items }`, matching the customer dashboard and storefront save controls.

## Cart and orders

`GET /cart`, `POST/PATCH/DELETE /cart/items`, `GET /orders`, `GET /orders/:orderNumber`, and `POST /orders` are customer-authenticated. Order creation requires the `Idempotency-Key` header; the frontend checkout now generates and sends it. The order response includes nested items and formatted subtotal/total fields.

## Admin orders

`GET /admin/orders` and `PATCH /admin/orders/:orderNumber/status` are admin-only and support the order dashboard and order status controls.

## Bulk enquiries

`POST /bulk-enquiries` accepts multiple product lines and delivery/contact details. Product eligibility and quantity validation belong at the backend boundary before persistence.

## Error contract

Errors are returned as `{ code, message, details }`. Protected endpoints return `401` for missing/invalid authentication and `403` for insufficient role permissions.
