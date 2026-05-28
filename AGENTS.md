# AGENTS.md — Leather-Inventory (Inventory Management System)

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
| Database | MongoDB | latest (via Docker) |
| ODM | Mongoose | ^7.0.0 |
| Config | dotenv | ^16.0.0 |
| Dev reload | nodemon | ^3.0.0 |
| Linter | ESLint | ^10.4.0 |

### Frontend (`app/`)

| Layer | Technology | Version (specified) |
|-------|-----------|---------------------|
| Runtime | Node.js | 20+ (implied by dependencies) |
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
| Linter | ESLint | ^9.39.4 |
| Formatter | Prettier | ^3.8.1 |

### Container Services (Docker Compose — backend only)

- **app** — the Node.js API (exposes `3000`)
- **mongo** — MongoDB instance (exposes `27017`, volume `mongo-data`)
- **mongo-express** — Web-based MongoDB admin UI (exposes `8081`)

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
│   │   └── scripts/
│   │       └── migrate-product-categories.js
│   ├── .env                      # Environment variables (PORT, MONGO_URI, JWT_SECRET)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── ecosystem.config.cjs      # PM2 production process config
│   ├── eslint.config.mjs
│   ├── package.json
│   ├── package-lock.json
│   └── seed-admin.js
│
├── app/                          # Frontend React application
│   ├── src/
│   │   ├── App.tsx               # Root component with routing and auth guards
│   │   ├── main.tsx              # Application entry point (React root, providers)
│   │   ├── index.css             # Tailwind CSS imports + theme variables
│   │   ├── components/           # Shared / reusable components
│   │   │   ├── ui/               # shadcn/ui components (button, card, dialog, etc.)
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
│   │   │   ├── use-mobile.ts
│   │   │   └── useSidebar.ts
│   │   ├── layout/               # Layout components
│   │   │   ├── app-sidebar-layout.tsx
│   │   │   └── auth-layout.tsx
│   │   ├── lib/                  # Utilities, API clients, schemas
│   │   │   ├── api-client.ts
│   │   │   ├── auth-client.ts
│   │   │   ├── auth-schemas.ts
│   │   │   └── utils.ts
│   │   ├── pages/                # Top-level page components
│   │   │   ├── Home.tsx
│   │   │   ├── login.tsx
│   │   │   ├── signup.tsx
│   │   │   └── NotFound.tsx
│   │   └── assets/
│   ├── .env                      # Frontend dev env (VITE_API_URL)
│   ├── .env.production           # Frontend production env (VITE_API_URL=/api)
│   ├── .env.example
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
```

**Docker Compose (backend):**

```bash
cd api
docker-compose up --build
```

This builds the API image, starts MongoDB, and starts mongo-express. The API is available at `http://localhost:3000`. Mongo Express is at `http://localhost:8081` (credentials: `webuser` / `webpassword`).

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

In Docker Compose, `MONGO_URI` is overridden to `mongodb://mongo:27017/inventory_db`.

### Frontend (`app/.env`)

| Variable | Example | Purpose |
|----------|---------|---------|
| `VITE_API_URL` | `http://localhost:3000` | Base URL for backend API calls |

See `app/.env.example` for the template.

---

## Backend API Routes

All routes are mounted in `api/src/app.js` and prefixed as follows:

| Prefix | Route File | Supported Methods |
|--------|-----------|-------------------|
| `/api/auth` | `routes/auth.js` | `POST /register`, `POST /login`, `POST /change-password`, `GET /me` |
| `/users` | `routes/users.js` | `POST`, `GET`, `PATCH /:id`, `DELETE /:id` |
| `/products` | `routes/product.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/sales` | `routes/sales.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/goodIns` | `routes/goodIn.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/stores` | `routes/stores.js` | `POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| `/transfers` | `routes/transfers.js` | `POST`, `GET` |
| `/api/categories` | `routes/categories.js` | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| `/api/sub-categories` | `routes/subCategories.js` | `GET`, `POST`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `GET /category/:categoryId` |
| `/api/dashboard` | `routes/dashboard.js` | `GET /daily-sales`, `GET /store/:storeId` |
| `/api/stock` | `routes/stock.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `GET /available` |
| `/api/stockouts` | `routes/stockout.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id`, `PATCH /:id/accept`, `PATCH /:id/reject` |
| `/api/reports` | `routes/reports.js` | `GET` |

### Global Error Handling

- `404` — returned for unknown routes via a catch-all middleware.
- `500` — returned by a centralized error handler that logs `err.stack` to the console.

---

## Data Models (Backend)

### User

- `name` (String, required)
- `email` (String, required, unique)
- `phone` (String, unique, sparse)
- `password` (String, required) — hashed with bcrypt
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

### State Management & Data Fetching

- **TanStack Query** (`@tanstack/react-query`) handles server-state caching, mutations, and invalidation.
- Each feature module exposes an `api.ts` (raw fetch wrappers) and `hooks.ts` (query/mutation hooks).
- The global `QueryClient` is instantiated in `main.tsx`.

### Authentication

- **Custom JWT auth** (`lib/auth.ts`) provides `login`, `register`, `changePassword`, `fetchCurrentUser`, and session management via localStorage.
- The `fetcher` in `lib/api-client.ts` injects the `Bearer` token on every request.
- `useAuthSession()` is a TanStack Query hook that validates the token via `GET /api/auth/me`.
- The backend implements JWT auth in `routes/auth.js` with bcrypt-hashed passwords.

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

- `src/components/ui/` — shadcn/ui primitive components (Button, Card, Dialog, Input, Label, Select, Separator, Sheet, Sidebar, Skeleton, Table, Tabs, Tooltip, etc.).
- `src/lib/utils.ts` — `cn()` utility merging `clsx` + `tailwind-merge`.
- `src/lib/api-client.ts` — Generic `fetcher<T>` wrapper for JSON API calls.
- `src/lib/auth-schemas.ts` — Yup schemas for login and signup forms.
- `src/hooks/` — Global custom hooks (`useSidebar`, `use-mobile`).
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

1. **Some routes missing `authMiddleware`** — `/products`, `/sales`, `/goodIns`, `/transfers` do not have `authMiddleware` applied at the router level in `app.js`, though individual route handlers may check `req.user`.
2. **Missing Input Validation** — No middleware (e.g., Joi, Zod, express-validator) validates request bodies on the backend before they reach Mongoose. Validation relies solely on schema-level rules.
3. **ESLint Configuration Uses Browser Globals for Backend** — `api/eslint.config.mjs` sets `globals: globals.browser` for a Node.js backend. It should use `globals.node` instead.
4. **No Tests** — There is no testing framework, test directory, or test scripts configured in either workspace.
5. **No CI/CD** — No GitHub Actions, pre-commit hooks, or deployment pipelines are configured.
6. **No automated backups** — MongoDB backups are not configured.

---

## Security Considerations

- **Passwords are hashed with bcrypt** via `routes/auth.js`. The legacy `/users` `POST` route still accepts raw passwords — avoid using it directly.
- **JWT authentication** is implemented via `middleware/auth.js` and `routes/auth.js`.
- **Mongo Express** is exposed with basic HTTP authentication (`ME_CONFIG_BASICAUTH_USERNAME` / `ME_CONFIG_BASICAUTH_PASSWORD`) in the Docker Compose setup. Do not deploy the compose file to production without changing these defaults and adding TLS.
- **`.env` files** contain connection strings and secrets. Both `api/.env` and `app/.env` are ignored in `.gitignore`.
- **CORS is configured** on the backend (`app.use(cors())`) for local development. In production, both frontend and backend are served from the same domain via Nginx, so CORS is not needed.

---

## Deployment Notes

- The backend `Dockerfile` uses the official `node:18` image, installs dependencies, copies the full source, exposes port `3000`, and runs `node src/app.js`.
- The backend server binds to `0.0.0.0` explicitly (see `src/app.js`), which is required for Docker container accessibility.
- MongoDB data is persisted via a named Docker volume (`mongo-data`).
- The frontend is a static Vite build. Run `npm run build` in `app/` to produce a `dist/` folder that can be served by any static file server.
- For production VPS deployment, see `DEPLOY.md` which covers Ubuntu + Nginx + PM2 + MongoDB Atlas + Let's Encrypt.
- `api/ecosystem.config.cjs` is the PM2 process configuration for production.
- `app/.env.production` sets `VITE_API_URL=/api` for same-domain deployment behind Nginx.
