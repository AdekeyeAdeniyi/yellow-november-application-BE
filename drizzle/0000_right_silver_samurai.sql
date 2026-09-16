CREATE TABLE `bulk_enquiries` (
	`id` varchar(36) NOT NULL,
	`enquiry_number` varchar(40) NOT NULL,
	`status` varchar(30) NOT NULL DEFAULT 'submitted',
	`user_id` varchar(36),
	`contact` json NOT NULL,
	`items` json NOT NULL,
	`delivery` json NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `bulk_enquiries_id` PRIMARY KEY(`id`),
	CONSTRAINT `bulk_enquiries_enquiry_number_unique` UNIQUE(`enquiry_number`)
);
--> statement-breakpoint
CREATE TABLE `cart_items` (
	`id` varchar(36) NOT NULL,
	`cart_id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`quantity` int NOT NULL,
	`sell_as_pieces` boolean NOT NULL DEFAULT false,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `cart_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `carts` (
	`id` varchar(36) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `carts_id` PRIMARY KEY(`id`),
	CONSTRAINT `carts_user_id_unique` UNIQUE(`user_id`)
);
--> statement-breakpoint
CREATE TABLE `categories` (
	`id` varchar(36) NOT NULL,
	`name` varchar(160) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`description` text,
	`active` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `categories_name_unique` UNIQUE(`name`),
	CONSTRAINT `categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `inventory_movements` (
	`id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`type` varchar(20) NOT NULL,
	`reason` text NOT NULL,
	`reference` varchar(160),
	`delta_packs` int NOT NULL,
	`delta_pieces` int NOT NULL,
	`before_packs` int NOT NULL,
	`before_pieces` int NOT NULL,
	`after_packs` int NOT NULL,
	`after_pieces` int NOT NULL,
	`created_at` datetime NOT NULL,
	CONSTRAINT `inventory_movements_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` varchar(36) NOT NULL,
	`order_id` varchar(36) NOT NULL,
	`variant_id` varchar(36) NOT NULL,
	`product_name` varchar(200) NOT NULL,
	`variant_name` varchar(160) NOT NULL,
	`sku` varchar(120) NOT NULL,
	`quantity` int NOT NULL,
	`price_kobo` int NOT NULL,
	`sell_as_pieces` boolean NOT NULL,
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` varchar(36) NOT NULL,
	`order_number` varchar(40) NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`status` varchar(40) NOT NULL,
	`subtotal_kobo` int NOT NULL,
	`total_kobo` int NOT NULL,
	`address` json NOT NULL,
	`idempotency_key` varchar(120),
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `orders_id` PRIMARY KEY(`id`),
	CONSTRAINT `orders_order_number_unique` UNIQUE(`order_number`),
	CONSTRAINT `orders_idempotency_key_unique` UNIQUE(`idempotency_key`)
);
--> statement-breakpoint
CREATE TABLE `products` (
	`id` varchar(36) NOT NULL,
	`category_id` varchar(36) NOT NULL,
	`slug` varchar(180) NOT NULL,
	`name` varchar(200) NOT NULL,
	`selling_mode` varchar(20) NOT NULL,
	`short_description` text NOT NULL,
	`description` text NOT NULL,
	`packaging` varchar(255) NOT NULL,
	`storage` varchar(255) NOT NULL,
	`image` text,
	`images` json NOT NULL,
	`publication_status` varchar(20) NOT NULL DEFAULT 'draft',
	`featured` boolean NOT NULL DEFAULT false,
	`allow_bulk_enquiry` boolean NOT NULL DEFAULT true,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `products_id` PRIMARY KEY(`id`),
	CONSTRAINT `products_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `saved_products` (
	`user_id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`created_at` datetime NOT NULL
);
--> statement-breakpoint
CREATE TABLE `users` (
	`id` varchar(36) NOT NULL,
	`email` varchar(255) NOT NULL,
	`name` varchar(160) NOT NULL,
	`phone` varchar(40),
	`password_hash` varchar(255) NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'customer',
	`status` varchar(20) NOT NULL DEFAULT 'active',
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `users_id` PRIMARY KEY(`id`),
	CONSTRAINT `users_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `variants` (
	`id` varchar(36) NOT NULL,
	`product_id` varchar(36) NOT NULL,
	`sku` varchar(120) NOT NULL,
	`name` varchar(160) NOT NULL,
	`sellable_type` varchar(20) NOT NULL,
	`price_kobo` int,
	`active` boolean NOT NULL DEFAULT true,
	`inventory_packs` int NOT NULL DEFAULT 0,
	`inventory_pieces` int NOT NULL DEFAULT 0,
	`pieces_per_pack` int NOT NULL DEFAULT 1,
	`low_stock_threshold` int NOT NULL DEFAULT 5,
	`min_order_quantity` int NOT NULL DEFAULT 1,
	`max_order_quantity` int NOT NULL DEFAULT 0,
	`image` text,
	`images` json NOT NULL,
	`created_at` datetime NOT NULL,
	`updated_at` datetime NOT NULL,
	CONSTRAINT `variants_id` PRIMARY KEY(`id`),
	CONSTRAINT `variants_sku_unique` UNIQUE(`sku`)
);
