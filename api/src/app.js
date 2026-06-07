import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import "dotenv/config";
import { authMiddleware } from "./middleware/auth.js";

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    console.error(`FATAL: ${name} is not set. Set it in your environment or .env file.`);
    process.exit(1);
  }
  return value;
}

import userRoutes from "./routes/users.js";
import salesRoutes from "./routes/sales.js";
import productRoutes from "./routes/product.js";
import goodInRoutes from "./routes/goodIn.js";
import transferRoutes from "./routes/transfers.js";
import storeRoutes from "./routes/stores.js";
import categoryRoutes from "./routes/categories.js";
import subCategoryRoutes from "./routes/subCategories.js";
import authRoutes from "./routes/auth.js";
import dashboardRoutes from "./routes/dashboard.js";
import stockRoutes from "./routes/stock.js";
import stockoutRoutes from "./routes/stockout.js";
import reportRoutes from "./routes/reports.js";
import productGroupRoutes from "./routes/productGroups.js";

const app = express();

const corsOrigin = process.env.CORS_ORIGIN;
const corsOptions = corsOrigin
  ? { origin: corsOrigin.split(",").map((s) => s.trim()) }
  : {};
app.use(cors(corsOptions));

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));

// Database connection

const dbURI = process.env.MONGO_URI || "mongodb://localhost:27017/inventory_db";
mongoose
  .connect(dbURI)
  .then(() => console.log("Successfully connected to MongoDB"))
  .catch((err) => console.error("Initial MongoDB connection error:", err));

mongoose.connection.on("error", (err) => {
  console.error("MongoDB runtime error:", err);
});

// Your Application Routes
app.use("/api/auth", authRoutes);

app.use("/users", authMiddleware, userRoutes);
app.use("/sales", authMiddleware, salesRoutes);
app.use("/products", authMiddleware, productRoutes);
app.use("/goodIns", authMiddleware, goodInRoutes);
app.use("/transfers", authMiddleware, transferRoutes);
app.use("/stores", authMiddleware, storeRoutes);
app.use("/api/categories", authMiddleware, categoryRoutes);
app.use("/api/sub-categories", authMiddleware, subCategoryRoutes);
app.use("/api/dashboard", authMiddleware, dashboardRoutes);
app.use("/api/stock", authMiddleware, stockRoutes);
app.use("/api/stockouts", authMiddleware, stockoutRoutes);
app.use("/api/reports", authMiddleware, reportRoutes);
app.use("/api/product-groups", authMiddleware, productGroupRoutes);

app.get("/health", (_req, res) => {
  const dbState = mongoose.connection.readyState;
  res.status(dbState === 1 ? 200 : 503).json({
    status: dbState === 1 ? "ok" : "error",
    db: dbState === 1 ? "connected" : "disconnected",
  });
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
