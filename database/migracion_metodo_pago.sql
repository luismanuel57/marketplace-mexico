-- ============================================================
-- Tianguis Digital - Migración: método de pago en órdenes
-- Examen Unidad 3 | PostgreSQL 16
--
-- Se aplica sobre una base YA existente (create_database.sql + data.sql ya
-- ejecutados y con datos). No sustituye a los archivos fuente; estos se
-- actualizan por separado (create_database.sql incluye la columna).
--
-- El pago es simulado: no existe pasarela real, solo se registra cómo
-- declaró el cliente que pagaría (tarjeta_prueba, efectivo o sin especificar).
--
-- Ejecutar:
--   psql -U tianguis -h localhost -d tianguis_digital -f migracion_metodo_pago.sql
-- O bien con un script node + pg copiado dentro de backend/.
-- ============================================================

BEGIN;

ALTER TABLE ordenes ADD COLUMN IF NOT EXISTS metodo_pago VARCHAR(20) NOT NULL DEFAULT 'no_especificado'
  CHECK (metodo_pago IN ('no_especificado', 'tarjeta_prueba', 'efectivo'));

COMMIT;
