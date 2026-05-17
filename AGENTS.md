# AGENTS.md — Inventory Management System Backend

This document describes the project structure, technology stack, conventions, and critical known issues. It is intended for AI coding agents and human developers who need to onboard quickly.

---

## Project Overview

This is the backend API for **Leather-Inventory**, an inventory management system. It is a Node.js / Express application that persists data in MongoDB via Mongoose. The API supports users, products, stores, stock-ins (`GoodIn`), sales, and stock transfers between locations.

The repository is located at the project root (`C:\Users\HP\Documents\My-Project\Inventory Management System`) and the application code lives entirely inside the `api/` subdirectory. There is no frontend codebase in this repository.

---

## Technology Stack

| Layer | Technology | Version (specified) |
|-------|-----------|---------------------|
| Runtime | Node.js | 18 (Docker base image) |
| Framework | Express | ^4.18.0 |
| Database | MongoDB | latest (via Docker) |
| ODM | Mongoose | ^7.0.0 |
| Config | dotenv | ^16.0.0 |
| Dev reload | nodemon | ^3.0.0 |
| Linter | ESLint | ^10.4.0 |

### Container Services (Docker Compose)
- **app** — the Node.js API (exposes `3000`)
- **mongo** — MongoDB instance (exposes `27017`, volume `mongo-data`)
- **mongo-express** — Web-based MongoDB admin UI (exposes `8081`)

---

## Project Structure

```
.
├── api/
│   ├── src/
│   │   ├── app.js              # Entry point: Express setup, DB connection, route mounting
│   │   ├── models/             # Mongoose schemas
│   │   │   ├── Goodin.js
│   │   │   ├── Products.js
│   │   │   ├── Sale.js
│   │   │   ├── Stores.js
│   │   │   ├── Transfer.js
│   │   │   └── User.js
│   │   └── routes/             # Express route handlers (business logic lives here)
│   │       ├── goodIn.js
│   │       ├── product.js
│   │       ├── sales.js
│   │       ├── stores.js
│   │       ├── transfers.js
│   │       └── users.js
│   ├── .env                    # Environment variables (PORT, MONGO_URI)
│   ├── Dockerfile
│   ├── docker-compose.yml
│   ├── eslint.config.mjs
│   ├── package.json
│   └── package-lock.json
├── .gitignore
└── README.md
```

**Note:** There is no `controllers/` directory in use. All request handling logic is implemented directly inside route files.

---

## Build, Run, and Test Commands

All commands below assume you are inside the `api/` directory.

### Local Development (requires local MongoDB or a running Docker Compose stack)

```bash
# Install dependencies
npm install

# Start in production mode
npm start                 # node src/app.js

# Start in development mode with auto-reload
npm run dev               # nodemon src/app.js
```

### Docker Compose

```bash
cd api
docker-compose up --build
```

This builds the API image, starts MongoDB, and starts mongo-express. The API will be available at `http://localhost:3000`. Mongo Express is available at `http://localhost:8081` (credentials: `webuser` / `webpassword`).

### Linting

There is no lint script defined in `package.json`, but you can run ESLint manually:

```bash
npx eslint src/
```

**Note:** There is currently no test suite, test runner, or test scripts in `package.json`.

---

## Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `PORT` | `3000` | HTTP port the Express server listens on |
| `MONGO_URI` | `mongodb://localhost:27017/inventory_db` | MongoDB connection string |

In the Docker Compose setup, `MONGO_URI` is overridden to `mongodb://mongo:27017/inventory_db` so the app connects to the `mongo` service container.

---

## API Routes

All routes are mounted in `src/app.js` and prefixed as follows:

| Prefix | Route File | Supported Methods |
|--------|-----------|-------------------|
| `/users` | `routes/users.js` | `POST`, `GET` |
| `/products` | `routes/product.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/sales` | `routes/sales.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/goodIns` | `routes/goodIn.js` | `POST`, `GET`, `GET /:id`, `PATCH /:id`, `DELETE /:id` |
| `/stores` | `routes/stores.js` | `POST`, `GET`, `GET /:id`, `PUT /:id`, `DELETE /:id` |
| `/transfers` | `routes/transfers.js` | `POST`, `GET` |

### Global Error Handling
- `404` — returned for unknown routes via a catch-all middleware.
- `500` — returned by a centralized error handler that logs `err.stack` to the console.

---

## Data Models

### User
- `name` (String, required)
- `email` (String, required, unique)
- `password` (String, required) — stored as plain text
- `role` (String, enum: `['admin', 'manager', 'staff']`, default: `'staff'`)
- `is_active` (Boolean)
- Timestamps enabled

### Products
- `name` (String, required)
- `description` (String)
- `category` (String)
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
- `address` (String, required)
- `manager_id` (ObjectId ref User)
- `items` — array of `{ item_id: ObjectId ref Products, quantity: Number, price: Number }`

### Transfer
- `items` — array reusing `GoodInItemSchema`
- `origin` (String, required)
- `destination` (String, required)
- Timestamps enabled

---

## Code Style and Conventions

- JavaScript source files use **both CommonJS (`require`/`module.exports`) and ES Modules (`import`/`export`) inconsistently** across the codebase.
  - `package.json` declares `"type": "module"`.
  - `src/app.js`, `src/routes/users.js`, `src/routes/stores.js`, and `src/routes/transfers.js` use `require`/`module.exports`.
  - `src/routes/product.js`, `src/routes/sales.js`, `src/routes/goodIn.js`, and all `src/models/*.js` files use `import`/`export default`.
- The codebase does not use TypeScript.
- Route handlers are async functions with `try / catch` blocks.
- Models use Mongoose `Schema` definitions; some schemas are exported for reuse (e.g., `GoodInItemSchema`, `TransactionItemSchema`).

---

## Known Critical Issues

1. **Module System Mismatch** — `src/app.js` uses `require()` while `package.json` specifies `"type": "module"`. This will cause a runtime error when starting the application.
2. **Broken Import in `src/routes/sales.js`** — The file starts with a malformed `import` statement on line 1 and is missing the `Router` and `Sale` imports, making the route file syntactically invalid.
3. **Incorrect Mongoose Import in `src/models/Transfer.js`** — Uses `import { Schema, mongoose } from "mongoose"`; `mongoose` is not a named export. It also instantiates the schema with `new mongoose.Schema` while `Schema` is already imported.
4. **Plain-Text Passwords** — The `User` model stores passwords in plain text. There is no hashing middleware or authentication layer.
5. **Missing Input Validation** — No middleware (e.g., Joi, Zod, express-validator) validates request bodies before they reach Mongoose. Validation relies solely on schema-level rules.
6. **No Authentication / Authorization Middleware** — Despite having a `role` field on users, every endpoint is publicly accessible.
7. **ESLint Configuration Uses Browser Globals** — `eslint.config.mjs` sets `globals: globals.browser` for a Node.js backend. It should use `globals.node` instead.
8. **No Tests** — There is no testing framework, test directory, or test scripts configured.

---

## Deployment Notes

- The `Dockerfile` uses the official `node:18` image, installs dependencies, copies the full source, exposes port `3000`, and runs `node src/app.js`.
- The server binds to `0.0.0.0` explicitly (see `src/app.js`), which is required for Docker container accessibility.
- MongoDB data is persisted via a named Docker volume (`mongo-data`).

---

## Security Considerations

- Passwords are stored in plain text in the database.
- There is no JWT, session, or API-key authentication.
- Mongo Express is exposed with basic HTTP authentication (`ME_CONFIG_BASICAUTH_USERNAME` / `ME_CONFIG_BASICAUTH_PASSWORD`) in the Docker Compose setup. Do not deploy the compose file to production without changing these defaults and adding TLS.
- The `.env` file contains connection strings and is ignored by `.gitignore` only at the root level; ensure `api/.env` is also protected from accidental commits.
