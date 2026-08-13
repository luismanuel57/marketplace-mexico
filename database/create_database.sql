-- ============================================================
-- Tianguis Digital - Estructura de la base de datos
-- Examen Unidad 3 | PostgreSQL 16
--
-- Antes de ejecutar: crear la base de datos y el usuario
--   CREATE DATABASE tianguis_digital OWNER tianguis;
-- Luego ejecutar este archivo:
--   psql -U tianguis -h localhost -d tianguis_digital -f create_database.sql
-- ============================================================

DROP TABLE IF EXISTS orden_detalle CASCADE;
DROP TABLE IF EXISTS ordenes CASCADE;
DROP TABLE IF EXISTS domicilios CASCADE;
DROP TABLE IF EXISTS bolsa_detalle CASCADE;
DROP TABLE IF EXISTS bolsa CASCADE;
DROP TABLE IF EXISTS articulos CASCADE;
DROP TABLE IF EXISTS categorias CASCADE;
DROP TABLE IF EXISTS clientes CASCADE;
DROP TABLE IF EXISTS roles CASCADE;

-- ------------------------------------------------------------
-- roles
-- ------------------------------------------------------------
CREATE TABLE roles (
  id_rol      SERIAL PRIMARY KEY,
  nombre_rol  VARCHAR(30)  NOT NULL UNIQUE,
  descripcion VARCHAR(150)
);

-- ------------------------------------------------------------
-- clientes (usuarios de la plataforma)
-- ------------------------------------------------------------
CREATE TABLE clientes (
  id_cliente        SERIAL PRIMARY KEY,
  nombre            VARCHAR(60)  NOT NULL,
  apellido_paterno  VARCHAR(60)  NOT NULL,
  apellido_materno  VARCHAR(60),
  correo            VARCHAR(120) NOT NULL UNIQUE,
  telefono          VARCHAR(15),
  contrasena_hash   VARCHAR(255) NOT NULL,
  id_rol            INT          NOT NULL REFERENCES roles(id_rol),
  fecha_registro    TIMESTAMP    NOT NULL DEFAULT NOW(),
  estatus           VARCHAR(15)  NOT NULL DEFAULT 'activo'
                    CHECK (estatus IN ('activo', 'inactivo'))
);

-- ------------------------------------------------------------
-- categorias
-- ------------------------------------------------------------
CREATE TABLE categorias (
  id_categoria   SERIAL PRIMARY KEY,
  nombre         VARCHAR(60)  NOT NULL UNIQUE,
  descripcion    VARCHAR(200),
  fecha_creacion TIMESTAMP    NOT NULL DEFAULT NOW(),
  estatus        VARCHAR(15)  NOT NULL DEFAULT 'activo'
                 CHECK (estatus IN ('activo', 'inactivo'))
);

-- ------------------------------------------------------------
-- articulos (productos del catálogo)
-- La imagen vive en Google Drive; en la BD solo su referencia
-- ------------------------------------------------------------
CREATE TABLE articulos (
  id_articulo    SERIAL PRIMARY KEY,
  id_categoria   INT           NOT NULL REFERENCES categorias(id_categoria),
  id_vendedor    INT           NOT NULL REFERENCES clientes(id_cliente),
  nombre         VARCHAR(100)  NOT NULL,
  descripcion    TEXT,
  precio_mxn     NUMERIC(10,2) NOT NULL CHECK (precio_mxn >= 0),
  existencias    INT           NOT NULL DEFAULT 0 CHECK (existencias >= 0),
  imagen_url     VARCHAR(300),
  marca          VARCHAR(60),
  estatus        VARCHAR(15)   NOT NULL DEFAULT 'activo'
                 CHECK (estatus IN ('activo', 'inactivo')),
  fecha_registro TIMESTAMP     NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_articulos_categoria ON articulos(id_categoria);
CREATE INDEX idx_articulos_nombre    ON articulos(nombre);
CREATE INDEX idx_articulos_estatus   ON articulos(estatus);
CREATE INDEX idx_articulos_vendedor  ON articulos(id_vendedor);

-- ------------------------------------------------------------
-- bolsa (carrito de compras)
-- ------------------------------------------------------------
CREATE TABLE bolsa (
  id_bolsa       SERIAL PRIMARY KEY,
  id_cliente     INT      NOT NULL REFERENCES clientes(id_cliente),
  fecha_creacion TIMESTAMP NOT NULL DEFAULT NOW(),
  estatus        VARCHAR(15) NOT NULL DEFAULT 'abierta'
                 CHECK (estatus IN ('abierta', 'convertida', 'cancelada'))
);

-- ------------------------------------------------------------
-- bolsa_detalle (productos dentro de la bolsa)
-- ------------------------------------------------------------
CREATE TABLE bolsa_detalle (
  id_detalle      SERIAL PRIMARY KEY,
  id_bolsa        INT           NOT NULL REFERENCES bolsa(id_bolsa) ON DELETE CASCADE,
  id_articulo     INT           NOT NULL REFERENCES articulos(id_articulo),
  cantidad        INT           NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  UNIQUE (id_bolsa, id_articulo)
);

-- ------------------------------------------------------------
-- domicilios (direcciones de entrega en México)
-- ------------------------------------------------------------
CREATE TABLE domicilios (
  id_domicilio      SERIAL PRIMARY KEY,
  id_cliente        INT          NOT NULL REFERENCES clientes(id_cliente),
  nombre            VARCHAR(60),
  calle             VARCHAR(120) NOT NULL,
  numero            VARCHAR(20),
  colonia           VARCHAR(120) NOT NULL,
  codigo_postal     VARCHAR(5)   NOT NULL,
  municipio         VARCHAR(120) NOT NULL,
  estado            VARCHAR(60)  NOT NULL,
  pais              VARCHAR(60)  NOT NULL DEFAULT 'México',
  telefono_contacto VARCHAR(15)
);

-- ------------------------------------------------------------
-- ordenes (pedidos)
-- ------------------------------------------------------------
CREATE TABLE ordenes (
  id_orden      SERIAL PRIMARY KEY,
  folio_orden   VARCHAR(20)    NOT NULL UNIQUE,
  id_cliente    INT            NOT NULL REFERENCES clientes(id_cliente),
  id_domicilio  INT            NOT NULL REFERENCES domicilios(id_domicilio),
  fecha_orden   TIMESTAMP      NOT NULL DEFAULT NOW(),
  subtotal      NUMERIC(12,2)  NOT NULL DEFAULT 0,
  envio         NUMERIC(10,2)  NOT NULL DEFAULT 0,
  total         NUMERIC(12,2)  NOT NULL DEFAULT 0,
  estado        VARCHAR(20)    NOT NULL DEFAULT 'pendiente'
                CHECK (estado IN ('pendiente', 'confirmado', 'preparando',
                                  'enviado', 'entregado', 'cancelado'))
);

CREATE INDEX idx_ordenes_cliente ON ordenes(id_cliente);
CREATE INDEX idx_ordenes_estado  ON ordenes(estado);

-- ------------------------------------------------------------
-- orden_detalle (productos de cada pedido, precios congelados)
-- ------------------------------------------------------------
CREATE TABLE orden_detalle (
  id_detalle      SERIAL PRIMARY KEY,
  id_orden        INT           NOT NULL REFERENCES ordenes(id_orden) ON DELETE CASCADE,
  id_articulo     INT           NOT NULL REFERENCES articulos(id_articulo),
  cantidad        INT           NOT NULL CHECK (cantidad > 0),
  precio_unitario NUMERIC(10,2) NOT NULL,
  subtotal        NUMERIC(12,2) NOT NULL
);
