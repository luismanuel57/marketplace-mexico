-- ============================================================
-- Tianguis Digital - Migración: tabla codigos_postales
-- Catálogo SEPOMEX para autocompletado de código postal.
--
-- Aplicar a la base existente con:
--   psql -U tianguis -h localhost -d tianguis_digital -f migracion_codigos_postales.sql
--
-- La estructura es idéntica a la de create_database.sql.
-- La restricción UNIQUE evita repetidos al cargar con
-- INSERT ... ON CONFLICT DO NOTHING (un mismo CP y colonia
-- puede aparecer en varios municipios/estados).
-- ============================================================

CREATE TABLE codigos_postales (
  id           SERIAL PRIMARY KEY,
  cp           VARCHAR(5)   NOT NULL,
  colonia      VARCHAR(120) NOT NULL,
  tipo_colonia VARCHAR(60),
  municipio    VARCHAR(120) NOT NULL,
  estado       VARCHAR(80)  NOT NULL,
  ciudad       VARCHAR(120),
  UNIQUE (cp, colonia, municipio)
);

CREATE INDEX idx_cp_codigo ON codigos_postales(cp);
