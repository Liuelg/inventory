import express from "express";
import mongoose from "mongoose";
import cors from "cors"; // Import the cors package
import "dotenv/config";
import { authMiddleware } from "./middleware/auth.js";

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

const app = express();

// CORS configuration for frontend API access
app.use(
  cors()
);

app.use(express.json());

// Database connection

const dbURI = "mongodb://localhost:27017/inventory_db";
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

// Error and Fallback Handlers
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res) => {
  console.error(err.stack);
  res.status(500).json({ message: "Something went wrong on the server" });
});

// eslint-disable-next-line no-undef
const PORT = process.env.PORT || 3000;
app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server is running on port ${PORT}`);
});
