export const ROLES = ["customer", "admin"] as const;
export type Role = (typeof ROLES)[number];

export const SELLING_MODES = ["single", "pack", "variants"] as const;
export type SellingMode = (typeof SELLING_MODES)[number];

export const ORDER_STATUSES = ["submitted", "awaiting_confirmation", "confirmed", "processing", "completed", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const INVENTORY_MOVEMENT_TYPES = ["receive", "adjust", "damage", "return"] as const;
export type InventoryMovementType = (typeof INVENTORY_MOVEMENT_TYPES)[number];
