CREATE TABLE `audit_logs` (
  `id` varchar(36) NOT NULL,
  `actor_user_id` varchar(36),
  `actor_role` varchar(20),
  `action` varchar(80) NOT NULL,
  `entity_type` varchar(50) NOT NULL,
  `entity_id` varchar(120),
  `request_id` varchar(120),
  `ip_address` varchar(64),
  `user_agent` varchar(500),
  `before` json,
  `after` json,
  `metadata` json NOT NULL,
  `created_at` datetime NOT NULL,
  CONSTRAINT `audit_logs_id` PRIMARY KEY(`id`)
);
