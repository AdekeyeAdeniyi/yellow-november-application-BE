import { boolean, datetime, index, int, json, mysqlTable, text, varchar } from "drizzle-orm/mysql-core";

const timestamps = { createdAt: datetime("created_at").notNull(), updatedAt: datetime("updated_at").notNull() };
export const users = mysqlTable("users", {
  id: varchar("id", { length: 36 }).primaryKey(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  phone: varchar("phone", { length: 40 }),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  role: varchar("role", { length: 20 }).notNull().default("customer"),
  status: varchar("status", { length: 20 }).notNull().default("active"),
  ...timestamps,
});
export const categories = mysqlTable("categories", {
  id: varchar("id", { length: 36 }).primaryKey(),
  name: varchar("name", { length: 160 }).notNull().unique(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  description: text("description"),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});
export const products = mysqlTable("products", {
  id: varchar("id", { length: 36 }).primaryKey(),
  categoryId: varchar("category_id", { length: 36 }).notNull(),
  slug: varchar("slug", { length: 180 }).notNull().unique(),
  name: varchar("name", { length: 200 }).notNull(),
  sellingMode: varchar("selling_mode", { length: 20 }).notNull(),
  shortDescription: text("short_description").notNull(),
  description: text("description").notNull(),

  ingredients: text("ingredients"),
  processingInformation: text("processing_information"),

  packaging: varchar("packaging", { length: 255 }).notNull(),
  storage: varchar("storage", { length: 255 }).notNull(),

  shelfLife: varchar("shelf_life", { length: 255 }),
  certifications: varchar("certifications", { length: 255 }),

  image: text("image"),
  images: json("images").$type<string[]>().notNull(),

  publicationStatus: varchar("publication_status", { length: 20 }).notNull().default("draft"),

  featured: boolean("featured").notNull().default(false),
  allowBulkEnquiry: boolean("allow_bulk_enquiry").notNull().default(true),

  ...timestamps,
});

export const variants = mysqlTable("variants", {
  id: varchar("id", { length: 36 }).primaryKey(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  sku: varchar("sku", { length: 120 }).notNull().unique(),
  name: varchar("name", { length: 160 }).notNull(),
  sellableType: varchar("sellable_type", { length: 20 }).notNull(),
  priceKobo: int("price_kobo"),
  active: boolean("active").notNull().default(true),
  inventoryPacks: int("inventory_packs").notNull().default(0),
  inventoryPieces: int("inventory_pieces").notNull().default(0),
  piecesPerPack: int("pieces_per_pack").notNull().default(1),
  lowStockThreshold: int("low_stock_threshold").notNull().default(5),
  minOrderQuantity: int("min_order_quantity").notNull().default(1),
  maxOrderQuantity: int("max_order_quantity").notNull().default(0),
  image: text("image"),
  images: json("images").$type<string[]>().notNull(),
  ...timestamps,
});
export const savedProducts = mysqlTable("saved_products", {
  userId: varchar("user_id", { length: 36 }).notNull(),
  productId: varchar("product_id", { length: 36 }).notNull(),
  createdAt: datetime("created_at").notNull(),
});
export const carts = mysqlTable("carts", {
  id: varchar("id", { length: 36 }).primaryKey(),
  userId: varchar("user_id", { length: 36 }).notNull().unique(),
  updatedAt: datetime("updated_at").notNull(),
});
export const cartItems = mysqlTable("cart_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  cartId: varchar("cart_id", { length: 36 }).notNull(),
  variantId: varchar("variant_id", { length: 36 }).notNull(),
  quantity: int("quantity").notNull(),
  sellAsPieces: boolean("sell_as_pieces").notNull().default(false),
  ...timestamps,
});
export const orders = mysqlTable("orders", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderNumber: varchar("order_number", { length: 40 }).notNull().unique(),
  userId: varchar("user_id", { length: 36 }).notNull(),
  status: varchar("status", { length: 40 }).notNull(),
  subtotalKobo: int("subtotal_kobo").notNull(),
  totalKobo: int("total_kobo").notNull(),
  address: json("address").$type<Record<string, string>>().notNull(),
  idempotencyKey: varchar("idempotency_key", { length: 120 }).unique(),
  ...timestamps,
});
export const orderItems = mysqlTable("order_items", {
  id: varchar("id", { length: 36 }).primaryKey(),
  orderId: varchar("order_id", { length: 36 }).notNull(),
  variantId: varchar("variant_id", { length: 36 }).notNull(),
  productName: varchar("product_name", { length: 200 }).notNull(),
  variantName: varchar("variant_name", { length: 160 }).notNull(),
  sku: varchar("sku", { length: 120 }).notNull(),
  quantity: int("quantity").notNull(),
  priceKobo: int("price_kobo").notNull(),
  sellAsPieces: boolean("sell_as_pieces").notNull(),
});
export const inventoryMovements = mysqlTable("inventory_movements", {
  id: varchar("id", { length: 36 }).primaryKey(),
  variantId: varchar("variant_id", { length: 36 }).notNull(),
  type: varchar("type", { length: 20 }).notNull(),
  reason: text("reason").notNull(),
  reference: varchar("reference", { length: 160 }),
  deltaPacks: int("delta_packs").notNull(),
  deltaPieces: int("delta_pieces").notNull(),
  beforePacks: int("before_packs").notNull(),
  beforePieces: int("before_pieces").notNull(),
  afterPacks: int("after_packs").notNull(),
  afterPieces: int("after_pieces").notNull(),
  createdAt: datetime("created_at").notNull(),
});
export const bulkEnquiries = mysqlTable("bulk_enquiries", {
  id: varchar("id", { length: 36 }).primaryKey(),
  enquiryNumber: varchar("enquiry_number", { length: 40 }).notNull().unique(),
  status: varchar("status", { length: 30 }).notNull().default("submitted"),
  userId: varchar("user_id", { length: 36 }),
  contact: json("contact").$type<Record<string, string>>().notNull(),
  items: json("items").$type<unknown[]>().notNull(),
  delivery: json("delivery").$type<Record<string, string>>().notNull(),
  createdAt: datetime("created_at").notNull(),
});

/** Immutable business and security activity trail. Never update or delete rows in normal application flows. */
export const auditLogs = mysqlTable(
  "audit_logs",
  {
    id: varchar("id", { length: 36 }).primaryKey(),
    actorUserId: varchar("actor_user_id", { length: 36 }),
    actorRole: varchar("actor_role", { length: 20 }),
    action: varchar("action", { length: 80 }).notNull(),
    entityType: varchar("entity_type", { length: 50 }).notNull(),
    entityId: varchar("entity_id", { length: 120 }),
    requestId: varchar("request_id", { length: 120 }),
    ipAddress: varchar("ip_address", { length: 64 }),
    userAgent: varchar("user_agent", { length: 500 }),
    before: json("before").$type<Record<string, unknown> | null>(),
    after: json("after").$type<Record<string, unknown> | null>(),
    metadata: json("metadata").$type<Record<string, unknown>>().notNull(),
    createdAt: datetime("created_at").notNull(),
  },
  (table) => ({
    createdAtIdx: index("audit_logs_created_at_idx").on(table.createdAt),
    actorIdx: index("audit_logs_actor_user_id_idx").on(table.actorUserId),
    entityIdx: index("audit_logs_entity_idx").on(table.entityType, table.entityId),
    actionIdx: index("audit_logs_action_idx").on(table.action),
  }),
);
