ALTER TABLE products
  ADD COLUMN ingredients TEXT NULL,
  ADD COLUMN processing_information TEXT NULL,
  ADD COLUMN shelf_life VARCHAR(255) NULL,
  ADD COLUMN certifications VARCHAR(255) NULL;
