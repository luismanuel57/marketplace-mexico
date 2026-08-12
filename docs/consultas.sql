-- ============================================================
-- Tianguis Digital - Consultas de demostración
-- Video 3: Desarrollo de la base de datos
--
-- Ejecutar:
--   psql -U tianguis -h localhost -d tianguis_digital -f docs/consultas.sql
-- ============================================================

-- 1) CREACIÓN DE LA BASE DE DATOS Y TABLAS
-- Base: tianguis_digital  |  Tablas: roles, clientes, categorias,
-- articulos, bolsa, bolsa_detalle, domicilios, ordenes, orden_detalle

-- 2) CLÁVES PRIMARIAS
SELECT tc.table_name,
       kcu.column_name AS clave_primaria
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'PRIMARY KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 3) CLAVES FORÁNEAS
SELECT tc.table_name AS tabla,
       kcu.column_name AS clave_foranea,
       ccu.table_name AS tabla_referenciada,
       ccu.column_name AS columna_referenciada
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;

-- 4) RESTRICCIONES (CHECK, UNIQUE, NOT NULL)
SELECT tc.table_name,
       tc.constraint_type,
       tc.constraint_name
FROM information_schema.table_constraints AS tc
WHERE tc.table_schema = 'public'
  AND tc.constraint_type IN ('CHECK', 'UNIQUE')
ORDER BY tc.table_name, tc.constraint_type;

-- 5) DATOS DE PRUEBA: total de registros por tabla
SELECT 'roles' AS tabla, count(*) AS registros FROM roles
UNION ALL SELECT 'clientes', count(*) FROM clientes
UNION ALL SELECT 'categorias', count(*) FROM categorias
UNION ALL SELECT 'articulos', count(*) FROM articulos
UNION ALL SELECT 'domicilios', count(*) FROM domicilios
ORDER BY tabla;

-- 6) RELACIONES: productos con su categoría (JOIN 1 a N)
SELECT a.id_articulo,
       a.nombre,
       a.precio_mxn,
       a.existencias,
       c.nombre AS categoria
FROM articulos AS a
JOIN categorias AS c ON c.id_categoria = a.id_categoria
ORDER BY a.precio_mxn DESC;

-- 7) CONSULTA: búsqueda de productos por nombre (ILIKE)
SELECT id_articulo, nombre, precio_mxn, existencias
FROM articulos
WHERE nombre ILIKE '%laptop%'
   OR nombre ILIKE '%mouse%'
ORDER BY nombre;

-- 8) FILTROS SIMULTÁNEOS: categoría + rango de precio + disponibilidad
SELECT a.id_articulo, a.nombre, a.precio_mxn, a.existencias, c.nombre AS categoria
FROM articulos AS a
JOIN categorias AS c ON c.id_categoria = a.id_categoria
WHERE c.nombre = 'Computación'
  AND a.precio_mxn BETWEEN 300 AND 15000
  AND a.existencias > 0
ORDER BY a.precio_mxn;

-- 9) PRODUCTOS SIN EXISTENCIA (descontinuados o agotados)
SELECT id_articulo, nombre, existencias, estatus
FROM articulos
WHERE existencias = 0 OR estatus = 'inactivo';

-- 10) RELACIÓN 1 a N: clientes con su rol
SELECT cl.id_cliente,
       cl.nombre || ' ' || cl.apellido_paterno AS nombre_completo,
       r.nombre_rol AS rol,
       cl.correo
FROM clientes AS cl
JOIN roles AS r ON r.id_rol = cl.id_rol
ORDER BY cl.id_cliente;

-- 11) DOMICILIOS EN MÉXICO (direcciones completas)
SELECT cl.nombre || ' ' || cl.apellido_paterno AS cliente,
       d.calle || ' ' || d.numero || ', ' || d.colonia AS direccion,
       d.municipio, d.estado, d.codigo_postal, d.pais
FROM domicilios AS d
JOIN clientes AS cl ON cl.id_cliente = d.id_cliente;

-- 12) BOLSA (carrito): subtotal por producto del comprador
SELECT cl.nombre || ' ' || cl.apellido_paterno AS cliente,
       a.nombre AS producto,
       bd.cantidad,
       bd.precio_unitario,
       (bd.cantidad * bd.precio_unitario) AS subtotal_linea
FROM bolsa AS b
JOIN bolsa_detalle AS bd ON bd.id_bolsa = b.id_bolsa
JOIN articulos AS a ON a.id_articulo = bd.id_articulo
JOIN clientes AS cl ON cl.id_cliente = b.id_cliente
ORDER BY cl.id_cliente;

-- 13) PEDIDOS: total y estado por orden
SELECT o.id_orden,
       o.folio_orden,
       cl.nombre || ' ' || cl.apellido_paterno AS cliente,
       o.fecha_orden,
       o.total,
       o.estado
FROM ordenes AS o
JOIN clientes AS cl ON cl.id_cliente = o.id_cliente
ORDER BY o.fecha_orden DESC;

-- 14) DETALLE DE UN PEDIDO (relación puente ordenes - articulos)
SELECT o.folio_orden,
       a.nombre AS producto,
       od.cantidad,
       od.precio_unitario,
       od.subtotal
FROM orden_detalle AS od
JOIN ordenes AS o ON o.id_orden = od.id_orden
JOIN articulos AS a ON a.id_articulo = od.id_articulo
ORDER BY o.id_orden;
