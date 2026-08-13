-- ============================================================
-- Tianguis Digital - Migración: rol vendedor, productos destacados y bitácora
-- Examen Unidad 3 | PostgreSQL 16
--
-- Se aplica sobre una base YA existente (create_database.sql + data.sql ya
-- ejecutados y con datos). No sustituye a los archivos fuente; estos se
-- actualizan por separado.
--
-- Ejecutar:
--   psql -U tianguis -h localhost -d tianguis_digital -f migracion_vendedor_bitacora.sql
-- ============================================================

BEGIN;

-- 1. Rol vendedor ---------------------------------------------------
INSERT INTO roles (nombre_rol, descripcion)
VALUES ('vendedor', 'Publica y administra sus propios artículos')
ON CONFLICT (nombre_rol) DO NOTHING;

-- 2. Articulos: dueño vendedor ---------------------------------------
-- Primero se agrega la columna y se asigna el dueño actual (el admin),
-- luego se marca como NOT NULL para igualar create_database.sql.
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS id_vendedor INT REFERENCES clientes(id_cliente);

UPDATE articulos
   SET id_vendedor = (SELECT id_cliente FROM clientes WHERE correo = 'admin@tianguisdigital.mx')
 WHERE id_vendedor IS NULL;

ALTER TABLE articulos ALTER COLUMN id_vendedor SET NOT NULL;
CREATE INDEX IF NOT EXISTS idx_articulos_vendedor ON articulos(id_vendedor);

-- 3. Articulos: destacado (mismos destacados que data.sql) -----------
ALTER TABLE articulos ADD COLUMN IF NOT EXISTS destacado BOOLEAN NOT NULL DEFAULT FALSE;
CREATE INDEX IF NOT EXISTS idx_articulos_destacado ON articulos(id_articulo) WHERE destacado;

UPDATE articulos SET destacado = TRUE
 WHERE nombre IN ('Laptop Lenovo IdeaPad', 'Celular Xiaomi Redmi Note 13', 'Consola Nintendo Switch');

-- 4. Bitácora de auditoría --------------------------------------------
CREATE TABLE IF NOT EXISTS bitacora (
  id_bitacora SERIAL PRIMARY KEY,
  id_cliente   INT          REFERENCES clientes(id_cliente) ON DELETE SET NULL,
  correo       VARCHAR(120),
  accion       VARCHAR(60)  NOT NULL,
  entidad      VARCHAR(60),
  id_entidad   INT,
  detalle      JSONB,
  ip           VARCHAR(45),
  fecha        TIMESTAMP NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bitacora_cliente ON bitacora(id_cliente);
CREATE INDEX IF NOT EXISTS idx_bitacora_fecha   ON bitacora(fecha);

-- 5. Vendedor de prueba (contraseña: 12345) ----------------------------
-- Reutiliza el hash bcrypt de '12345' del data.sql (mismo estilo).
INSERT INTO clientes (nombre, apellido_paterno, correo, contrasena_hash, id_rol, estatus)
VALUES ('Ana', 'Vendedora', 'vendedor@tianguisdigital.mx',
        '$2b$10$RjWs3JZGlrpVVq2AVgHbLOtWhY1SdnRcgTbhi26SqXn09HMlM7S2a',
        (SELECT id_rol FROM roles WHERE nombre_rol = 'vendedor'), 'activo')
ON CONFLICT (correo) DO NOTHING;

-- 6. Asignar artículos al vendedor de prueba ----------------------------
UPDATE articulos
   SET id_vendedor = (SELECT id_cliente FROM clientes WHERE correo = 'vendedor@tianguisdigital.mx')
 WHERE nombre IN ('Mouse Logitech M185', 'Camisa de algodón', 'Licuadora Oster');

COMMIT;
