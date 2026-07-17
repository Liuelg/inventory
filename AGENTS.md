<!-- AGENTS.md — Leather-Inventory (Inventory Management System) -->

This document describes the full project structure, technology stack, conventions, and known issues. It is intended for AI coding agents and human developers who need to onboard quickly. The reader is assumed to know nothing about this project.

---

## Project Overview

**Leather-Inventory** is a full-stack inventory management system. It tracks products, stores, stock movements (goods-in), sales, and transfers between locations. The project is organized as a monorepo with two main applications:

- **`api/`** — Node.js / Express REST API backed by MongoDB (Mongoose).
- **`app/`** — React 19 / TypeScript single-page application built with Vite.

The repository is located at `C:\Users\HP\Documents\My-Project\Inventory Management System`.

---

## Technology Stack

### Backend (`api/`)

| Layer | Technology | Version (specified) |
|-------|-----------|---------------------|
| Runtime | Node.js | 18 (Docker base image) |
| Framework | Express | ^4.18.0 |
| Database | MongoDB | 6 (via Docker) |
| ODM | Mongoose | ^7.0.0 |
| Config | dotenv | ^16.0.0 |
| Auth | bcryptjs, jsonwebtoken | ^3.0.3, ^9.0.3 |
| Rate Limiting | express-rate-limit | ^8.5.2 |
| Dev reload | nodemon | ^3.0.0 |
| Telegram Bot | telegraf | ^4.x |
| Linter | ESLint | ^10.4.0 |

### Frontend (`app/`)

| Layer | Technology | Version (specified) |
|-------|-----------|---------------------|
| Runtime | Node.js | 22 (Docker build image) |
| Framework | React | ^19.2.4 |
| Language | TypeScript | ~5.9.3 |
| Bundler | Vite | ^7.3.1 |
| Styling | Tailwind CSS | ^4.2.1 |
| UI Components | shadcn/ui | v4 (radix-nova style) |
| Icons | Lucide React | ^1.7.0 |
| Data Fetching | TanStack Query (React Query) | ^5.100.5 |
| Authentication | Custom JWT | via jsonwebtoken |
| Forms | React Hook Form | ^7.72.1 |
| Validation | Yup | ^1.7.1 |
| Charts | Recharts | ^2.15.0 |
| PDF Generation | jspdf, jspdf-autotable | ^2.5.2, ^3.8.4 |
| Linter | ESLint | ^9.39.4 |
| Formatter | Prettier | ^3.8.1 |

### Container Services (Docker Compose — full stack)

- **backend** — the Node.js API (exposes `3000` internally)
- **mongo** — MongoDB 6 instance (exposes `27017` internally, volume `mongo-data`)
- **nginx** — reverse proxy + static file server for the React frontend (exposes `80`)

---

## Project Structure

```
.
├── api/                          # Backend REST API
│   ├── src/
│   │   ├── app.js                # Entry point: Express setup, DB connection, route mounting
│   │   ├── models/               # Mongoose schemas
│   │   │   ├── Category.js
│   │   │   ├── Goodin.js
│   │   │   ├── InvoiceCounter.js
│   │   │   ├── Products.js
│   │   │   ├── Sale.js
│   │   │   ├── Stock.js
│   │   │   ├── Stockout.js
│   │   │   ├── Stores.js
│   │   │   ├── SubCategory.js
│   │   │   ├── Transfer.js
│   │   │   └── User.js
│   │   ├── routes/               # Express route handlers (business logic lives here)
│   │   │   ├── auth.js
│   │   │   ├── categories.js
│   │   │   ├── dashboard.js
│   │   │   ├── goodIn.js
│   │   │   ├── product.js
│   │   │   ├── reports.js
│   │   │   ├── sales.js
│   │   │   ├── stock.js
│   │   │   ├── stockout.js
│   │   │   ├── stores.js
│   │   │   ├── subCategories.js
│   │   │   ├── transfers.js
│   │   │   └── users.js
│   │   └── middleware/
│   │       └── auth.js           # JWT verification middleware
│   │   └── scripts/
│   │       └── migrate-product-categories.js
│   ├── .env                      # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   ├── Dockerfile
│   ├── .dockerignore
│   ├── ecosystem.config.cjs      # PM2 production process config
│   ├── eslint.config.mjs
│   ├── package.json
│   ├── package-lock.json
│   └── seed-admin.js             # Bootstraps a default admin user
│
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── App.tsx               # Root component with routing and auth guards
│   │   ├── main.tsx              # Application entry point (React root, providers)
│   │   ├── index.css             # Tailwind CSS imports + theme variables
│   │   ├── components/           # Shared / reusable components
│   │   │   ├── ui/               # shadcn/ui components (button, card, dialog, etc.)
│   │   │   ├── ProductImageCell.tsx
│   │   │   ├── Table.tsx
│   │   │   └── theme-provider.tsx
│   │   ├── features/             # Feature-based modules
│   │   │   ├── accounts/         # User account management
│   │   │   ├── categories/       # Category management
│   │   │   ├── dashboard/        # Dashboard / daily sales
│   │   │   ├── good-ins/         # Stock In (review stockouts)
│   │   │   ├── my-store/         # Sales user store view
│   │   │   ├── products/         # Product catalog
│   │   │   ├── reports/          # Sales/stock reports
│   │   │   ├── sales/            # Sales records
│   │   │   ├── stock/            # Central stock (warehouse)
│   │   │   ├── stockouts/        # Stock transfers to stores
│   │   │   ├── stores/           # Store management
│   │   │   └── sub-categories/   # Sub-category management
│   │   ├── hooks/                # Global custom hooks
│   │   │   ├── use-auth-session.ts
│   │   │   ├── use-mobile.ts
│   │   │   └── useSidebar.ts
│   │   ├── layout/               # Layout components
│   │   │   ├── app-sidebar-layout.tsx
│   │   │   └── auth-layout.tsx
│   │   ├── lib/                  # Utilities, API clients, schemas
│   │   │   ├── api-client.ts     # Generic fetcher wrapper (native fetch)
│   │   │   ├── auth.ts           # Auth API + localStorage session helpers
│   │   │   ├── auth-schemas.ts   # Yup schemas for login/signup
│   │   │   ├── axios.ts          # Legacy-named fetch wrapper (uses native fetch, not axios)
│   │   │   ├── query-client.ts   # TanStack Query client instance
│   │   │   └── utils.ts          # cn() utility
│   │   └── pages/                # Top-level page components
│   │       ├── Home.tsx
│   │       ├── login.tsx
│   │       ├── signup.tsx
│   │       └── NotFound.tsx
│   ├── .env                      # Frontend dev env (VITE_API_URL)
│   ├── .env.production           # Frontend production env (VITE_API_URL=/api)
│   ├── .env.example
│   ├── .dockerignore
│   ├── index.html
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tsconfig.app.json
│   ├── tsconfig.node.json
│   ├── components.json           # shadcn/ui configuration
│   ├── eslint.config.js
│   ├── .prettierrc
│   ├── package.json
│   └── package-lock.json
│
├── nginx/
│   ├── Dockerfile
│   └── default.conf              # Nginx reverse-proxy + SPA config
│
├── .env.example                  # Example environment variables for Docker Compose
├── .gitignore
├── DEPLOY.md                     # DigitalOcean VPS deployment guide
├── README.md
└── AGENTS.md                     # This file
```

**Note:** The backend does not use a `controllers/` directory. All request handling logic is implemented directly inside route files.

---

## Build, Run, and Test Commands

### Backend (`api/`)

```bash
cd api

# Install dependencies
npm install

# Start in production mode
npm start                 # node src/app.js

# Start in development mode with auto-reload
npm run dev               # nodemon src/app.js

# Lint manually (no script in package.json)
npx eslint src/

# Seed default admin user
node seed-admin.js
```

**Docker Compose (full stack):**

```bash
# From the project root
cp .env.example .env   # Edit .env and set JWT_SECRET
docker-compose up --build
```

This builds and starts the backend, MongoDB, and nginx (with the built frontend). The application is available at `http://localhost`.

### Frontend (`app/`)

```bash
cd app

# Install dependencies
npm install

# Start development server
npm start                 # vite

# Production build
npm run build             # tsc -b && vite build

# Preview production build
npm run preview           # vite preview

# Lint
npm run lint              # eslint .

# Format
npm run format            # prettier --write "**/*.{ts,tsx}"

# Type check only
npm run typecheck         # tsc --noEmit
```

**Note:** There is currently no test suite, test runner, or test scripts configured in either workspace.

---

## Environment Variables

### Backend (`api/.env`)

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port the Express server listens on |
| `MONGO_URI` | `mongodb://localhost:27017/inventory_db` | MongoDB connection string |
| `JWT_SECRET` | *(none)* | Secret key for signing JWT tokens |
| `JWT_EXPIRES_IN` | `1d` | JWT token expiration time |
| `CORS_ORIGIN` | *(empty)* | Optional comma-separated allowed origins |
| `TELEGRAM_BOT_TOKEN` | *(none)* | Telegram bot token for sale notifications |
| `TELEGRAM_CHAT_ID` | *(none)* | Target chat or group ID for sale notifications |

In Docker Compose, `MONGO_URI` is overridden to `mongodb://mongo:27017/inventory_db` and `JWT_SECRET` is read from the root `.env` file.

### Frontend (`app/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:3000` | Base URL for backend API calls |

See `app/.env.example` for the template.

### Docker Compose (root `.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `JWT_SECRET` | *(none)* | Shared secret for backend token signing |
| `JWT_EXPIRES_IN` | `1d` | Token lifetime |
| `CORS_ORIGIN` | *(empty)* | CORS restriction (optional) |

---

## Backend API Routes

All routes are mounted in `api/src/app.js`. Every route except `/api/auth` and `/health` is protected by `authMiddleware`.

| Prefix | Route File | Supported Methods |
|--------|-----------|-------------------|
| `/api/auth` | `routes/auth.js` | `POST /register`, `POST /login`, `POST /change-password`, `GET /me` |
| `/api/users` | `routes/users.js` | `POST`, `GET`, `PATCH /:id`, `DELETE /:id` |
| `/api/products` | `routes/product.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/api/sales` | `routes/sales.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/api/goodIns` | `routes/goodIn.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/api/stores` | `routes/stores.js` | `POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| `/api/transfers` | `routes/transfers.js` | `POST`, `GET` |
| `/api/categories` | `routes/categories.js` | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| `/api/sub-categories` | `routes/subCategories.js` | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /category/:categoryId` |
| `/api/dashboard` | `routes/dashboard.js` | `GET /daily-sales`, `GET /store/:storeId` |
| `/api/stock` | `routes/stock.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /available` |
| `/api/stockouts` | `routes/stockout.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/accept`, `PATCH /:id/reject` |
| `/api/reports` | `routes/reports.js` | `GET` |
| `/health` | *(inline)* | `GET` — returns DB connectivity status |

### Global Error Handling

- `401` — returned by `authMiddleware` for missing or invalid JWT tokens.
- `404` — returned for unknown routes via a catch-all middleware.
- `500` — returned by a centralized error handler that logs `err.stack` to the console.

---

## Data Models (Backend)

### User

- `name` (String, required)
- `email` (String, required, unique)
- `phone` (String, unique, sparse)
- `password` (String, required) — hashed with bcrypt (salt rounds 10)
- `role` (String, enum: `['admin', 'sales', 'stock']`, default: `'stock'`)
- `is_active` (Boolean)
- `store` (ObjectId ref Store)
- Timestamps enabled

### Products

- `name` (String, required)
- `description` (String)
- `category` (ObjectId ref Category)
- `subCategory` (ObjectId ref SubCategory)
- `price` — subdocument `{ amount: Number, currency: String (default 'USD') }`
- `previous_prices` (Number)
- `tags` (Array of String)
- `image` (String)

### Sale

- `items` — array of `{ item_id: ObjectId ref Products, quantity: Number, price: Number }`
- `totalAmount` (Number, required)
- `customerName` (String)
- `store` (ObjectId ref Store, required)
- `processedBy` (ObjectId ref User, required)
- `date_time` (Date, required, default `Date.now`)
- `invoiceNumber` (String, required, unique)
- Timestamps enabled

### GoodIn (Stock In)

- `created_by` (ObjectId ref User, required)
- `date` (Date, default `Date.now`, required)
- `store` (ObjectId ref Store, required)
- `user` (ObjectId ref User, required)
- `items` — array of `{ item_id: ObjectId ref Products, quantity: Number, price: Number }`
- `is_accepted` (Boolean, default `false`)
- `accepted_at` (Date, default `null`)
- Timestamps enabled

### Store

- `name` (String, required)
- `code` (String, required, unique, uppercase, trimmed)
- `address` (String, required)
- `manager_id` (ObjectId ref User)
- `items` — array of `{ item_id: ObjectId ref Products, quantity: Number, price: Number }`

### Category

- `name` (String, required)
- Timestamps enabled

### SubCategory

- `name` (String, required)
- `category` (ObjectId ref Category, required)
- Timestamps enabled

### Stock

- `created_by` (ObjectId ref User, required)
- `date` (Date, default `Date.now`, required)
- `items` — array of `{ item_id: ObjectId ref Products, quantity: Number, remaining: Number, price: Number }`
- `totalAmount` (Number, required)
- `description` (String)
- `note` (String)
- Timestamps enabled

### Stockout

- `created_by` (ObjectId ref User, required)
- `date` (Date, default `Date.now`, required)
- `store` (ObjectId ref Store, required)
- `items` — array of `{ item_id: ObjectId ref Products, quantity: Number, price: Number }`
- `status` (String, enum: `['pending', 'accepted', 'rejected']`, default: `'pending'`)
- `accepted_by` (ObjectId ref User)
- `accepted_at` (Date)
- `note` (String)
- Timestamps enabled

### InvoiceCounter

- `store` (ObjectId ref Store, required, unique)
- `sequence` (Number, default `0`)

---

## Frontend Architecture

### Routing

React Router v7 (`BrowserRouter`) is used. Route definitions live in `app/src/App.tsx`.

| Route | Layout | Roles | Component |
|-------|--------|-------|-----------|
| `/` | AppSidebarLayout | `admin` | `Home` (Dashboard) |
| `/accounts` | AppSidebarLayout | `admin` | `AccountsPage` |
| `/category` | AppSidebarLayout | `admin`, `stock` | `CategoryPage` |
| `/products` | AppSidebarLayout | `admin`, `stock` | `ProductPage` |
| `/stock` | AppSidebarLayout | `admin`, `stock` | `StockPage` |
| `/stockouts` | AppSidebarLayout | `admin`, `stock` | `StockoutPage` |
| `/stores` | AppSidebarLayout | `admin` | `StorePage` |
| `/stores/:id` | AppSidebarLayout | `admin` | `StoreDetailPage` |
| `/sales` | AppSidebarLayout | `admin`, `sales` | `SalesPage` |
| `/good-ins` | AppSidebarLayout | `admin`, `sales` | `GoodInPage` |
| `/my-store` | AppSidebarLayout | `sales` | `MyStorePage` |
| `/reports` | AppSidebarLayout | `admin` | `ReportsPage` |
| `/login` | AuthLayout | Public | `LoginPage` |
| `*` | AppSidebarLayout | Any authed | `NotFound` / role redirect |

Auth guards:
- `RequireAuth` — redirects unauthenticated users to `/login`.
- `RedirectIfAuthed` — redirects authenticated users to their role's default route.
- `RequireRole` — redirects users without the required role to their default route.

Default role routes:
- `admin` → `/`
- `sales` → `/my-store`
- `stock` → `/stock`

### State Management & Data Fetching

- **TanStack Query** (`@tanstack/react-query`) handles server-state caching, mutations, and invalidation.
- Each feature module exposes an `api.ts` (raw fetch wrappers) and `hooks.ts` (query/mutation hooks).
- The global `QueryClient` is instantiated in `lib/query-client.ts` and provided in `main.tsx`.

### Authentication

- **Custom JWT auth** (`lib/auth.ts`) provides `login`, `register`, `changePassword`, `fetchCurrentUser`, and session management via `localStorage`.
- The `fetcher` in `lib/api-client.ts` injects the `Bearer` token on every request and clears the session on `401` responses.
- `useAuthSession()` is a TanStack Query hook that validates the token via `GET /api/auth/me`.
- The backend implements JWT auth in `routes/auth.js` with bcrypt-hashed passwords and express-rate-limit on the login endpoint.

### Feature-Based Folder Structure

Features are colocated under `src/features/<feature-name>/`:

```
features/<name>/
  api.ts           # API calls using fetcher from lib/api-client.ts
  hooks.ts         # TanStack Query hooks
  types.ts         # TypeScript interfaces / types
  components/      # Feature-specific UI components
  pages/           # Feature-specific page components (if any)
```

### Shared Code

- `src/components/ui/` — shadcn/ui primitive components (alert-dialog, button, card, dialog, dropdown-menu, input, label, select, separator, sheet, sidebar, skeleton, table, tabs, tooltip).
- `src/components/theme-provider.tsx` — Light/dark theme provider with system detection.
- `src/lib/utils.ts` — `cn()` utility merging `clsx` + `tailwind-merge`.
- `src/lib/api-client.ts` — Generic `fetcher<T>` wrapper for JSON API calls using native `fetch`.
- `src/lib/axios.ts` — Another native `fetch` wrapper (legacy filename; does not use the axios library).
- `src/lib/auth-schemas.ts` — Yup schemas for login and signup forms.
- `src/hooks/` — Global custom hooks (`useAuthSession`, `use-mobile`, `useSidebar`).
- `src/layout/` — Reusable layout shells (`AppSidebarLayout`, `AuthLayout`).

---

## Code Style Guidelines

### Backend (`api/`)

- **Module system:** ES Modules (`"type": "module"` in `package.json`). All source files use `import` / `export default`.
- **Quotes:** Mixed; most files use single quotes in imports and strings.
- **Semicolons:** Used consistently.
- **Indentation:** 2 spaces.
- **Error handling:** Async route handlers wrap logic in `try / catch` and return JSON error responses.
- **No TypeScript.**

### Frontend (`app/`)

- **Module system:** ES Modules.
- **Quotes:** Double quotes for strings and imports.
- **Semicolons:** **None** (enforced by Prettier).
- **Indentation:** 2 spaces.
- **Trailing commas:** `es5` style (enforced by Prettier).
- **Print width:** 80 characters.
- **Tailwind class ordering:** `prettier-plugin-tailwindcss` handles sorting.
- **TypeScript strictness:** Strict mode enabled. `noUnusedLocals` and `noUnusedParameters` are active — unused variables will fail the build.
- **Import alias:** `@/` maps to `./src/` (configured in `vite.config.ts` and `tsconfig.json`).

### shadcn/ui Conventions

- Style: `radix-nova`
- Base color: `neutral`
- CSS variables: enabled
- Icon library: `lucide`
- Components are added with `npx shadcn@latest add <component>`.
- Imported as: `import { Button } from "@/components/ui/button"`.

---

## Known Issues & Gaps

1. **Missing Input Validation** — No middleware (e.g., Joi, Zod, express-validator) validates request bodies on the backend before they reach Mongoose. Validation relies solely on schema-level rules and ad-hoc checks in route handlers.
2. **ESLint Configuration Uses Browser Globals for Backend** — `api/eslint.config.mjs` sets `globals: globals.browser` for a Node.js backend. It should use `globals.node` instead.
3. **No Tests** — There is no testing framework, test directory, or test scripts configured in either workspace.
4. **No CI/CD** — No GitHub Actions, pre-commit hooks, or deployment pipelines are configured.
5. **No automated backups** — MongoDB backups are not configured (see `DEPLOY.md` for a manual cron-based backup strategy).
6. **Password length mismatch** — The frontend signup form (`auth-schemas.ts`) requires passwords of at least 8 characters, but the backend register endpoint (`routes/auth.js`) only enforces a minimum of 6 characters.
7. **Legacy filename** — `app/src/lib/axios.ts` is named after the axios library but implements a native `fetch` wrapper.

---

## Security Considerations

- **Passwords are hashed with bcrypt** (salt rounds 10) via `routes/auth.js`.
- **JWT authentication** is implemented via `middleware/auth.js` and `routes/auth.js`.
- **Rate limiting** is applied to the login endpoint (`/api/auth/login`) via `express-rate-limit`: 20 attempts per 15-minute window.
- **`.env` files** contain connection strings and secrets. Both `api/.env` and `app/.env` are ignored in `.gitignore`. The root `.env` file (used by Docker Compose) should also be kept secret.
- **CORS is configurable** on the backend (`app.use(cors(corsOptions))`) via the `CORS_ORIGIN` environment variable. In production, both frontend and backend are served from the same domain via Nginx, so CORS is typically not needed.
- The `/api/auth/register` endpoint is protected by `authMiddleware` and restricts account creation to admins only.
- The `seed-admin.js` script creates a default admin with a hardcoded password (`admin12345`). This password should be changed immediately after first login.

---

## Deployment Notes

- The backend `Dockerfile` uses the official `node:18-alpine` image, installs dependencies, copies the full source, exposes port `3000`, and runs `node src/app.js`.
- The backend server binds to `0.0.0.0` explicitly (see `src/app.js`), which is required for Docker container accessibility.
- MongoDB data is persisted via a named Docker volume (`mongo-data`).
- The frontend is built inside the `nginx/Dockerfile` multi-stage build (using `node:22-alpine`) and served by nginx alongside API proxy routes.
- For production VPS deployment, see `DEPLOY.md` which covers Ubuntu + Nginx + PM2 + MongoDB Atlas + Let's Encrypt.
- `api/ecosystem.config.cjs` is the PM2 process configuration for production.
- `app/.env.production` sets `VITE_API_URL=/api` for same-domain deployment behind Nginx.
