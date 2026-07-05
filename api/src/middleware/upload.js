import multer from "multer";
import fs from "fs";
import path from "path";

const productsDir = "uploads/products";
const salesDir = "uploads/sales";
fs.mkdirSync(productsDir, { recursive: true });
fs.mkdirSync(salesDir, { recursive: true });

const fileFilter = (_req, file, cb) => {
  if (file.mimetype.startsWith("image/")) cb(null, true);
  else cb(new Error("Only image files are allowed"), false);
};

function createStorage(uploadDir) {
  return multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, uploadDir),
    filename: (_req, file, cb) => {
      const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
      const ext = path.extname(file.originalname);
      cb(null, `${unique}${ext}`);
    },
  });
}

export const uploadProductImage = multer({
  storage: createStorage(productsDir),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).single("image");

const MAX_SALE_ITEMS = 20;

export const uploadSaleImages = multer({
  storage: createStorage(salesDir),
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 },
}).fields(
  Array.from({ length: MAX_SALE_ITEMS }, (_, i) => ({
    name: `image_${i}`,
    maxCount: 1,
  }))
);
