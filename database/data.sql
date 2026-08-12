-- ============================================================
-- Tianguis Digital - Datos de prueba
-- Examen Unidad 3 | PostgreSQL 16
--
-- Ejecutar después de create_database.sql:
--   psql -U tianguis -h localhost -d tianguis_digital -f data.sql
--
-- Usuarios de prueba (contraseña de ambos: 12345)
--   admin@tianguisdigital.mx     (rol: administrador)
--   comprador@tianguisdigital.mx (rol: cliente)
-- ============================================================

-- Roles ------------------------------------------------------
INSERT INTO roles (nombre_rol, descripcion) VALUES
  ('cliente',       'Comprador que consulta el catálogo y genera pedidos'),
  ('administrador', 'Administra productos, categorías, usuarios y pedidos');

-- Clientes ----------------------------------------------------
-- Contraseñas almacenadas con bcrypt (hash), nunca en texto plano.
INSERT INTO clientes
  (nombre, apellido_paterno, apellido_materno, correo, telefono,
   contrasena_hash, id_rol, estatus)
VALUES
  ('Luis',   'Manuel', 'Hernández', 'admin@tianguisdigital.mx', '3331234567',
   '$2b$10$Y2./m5xqu9e9Nm64.V6lHerAwc8gq6aJL.J0n/gVlrSruWJHVSy.a',
   (SELECT id_rol FROM roles WHERE nombre_rol = 'administrador'), 'activo'),
  ('María',  'García', 'López',     'comprador@tianguisdigital.mx', '3312345678',
   '$2b$10$RjWs3JZGlrpVVq2AVgHbLOtWhY1SdnRcgTbhi26SqXn09HMlM7S2a',
   (SELECT id_rol FROM roles WHERE nombre_rol = 'cliente'), 'activo');

-- Categorías --------------------------------------------------
INSERT INTO categorias (nombre, descripcion) VALUES
  ('Electrónica',   'Televisores, audio y equipos electrónicos'),
  ('Computación',   'Laptops, accesorios y equipos de cómputo'),
  ('Telefonía',     'Celulares y accesorios'),
  ('Hogar',         'Artículos para el hogar y cocina'),
  ('Ropa',          'Prendas de vestir'),
  ('Deportes',      'Equipo y artículos deportivos'),
  ('Videojuegos',   'Consolas y juegos'),
  ('Libros',        'Libros y publicaciones'),
  ('Otros',         'Productos varios');

-- Artículos (imagen_url apunta a Google Drive; se completa en el Video 6) --
INSERT INTO articulos
  (id_categoria, nombre, descripcion, precio_mxn, existencias, imagen_url, marca, estatus)
VALUES
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Computación'),
   'Laptop Lenovo IdeaPad', 'Laptop de 15.6 pulgadas, 16 GB RAM, 512 GB SSD.',
   14999.00, 8, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_1', 'Lenovo', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Computación'),
   'Mouse Logitech M185',   'Mouse inalámbrico compacto para portátil.',
   349.00, 30, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_2', 'Logitech', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Telefonía'),
   'Celular Xiaomi Redmi Note 13', 'Pantalla AMOLED 6.67", 128 GB, 8 GB RAM.',
   4299.00, 12, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_3', 'Xiaomi', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Electrónica'),
   'Televisor Samsung 50" 4K', 'Smart TV 4K UHD con HDR.',
   8499.00, 5, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_4', 'Samsung', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Hogar'),
   'Licuadora Oster', 'Licuadora de vaso de vidrio con 7 velocidades.',
   1299.00, 15, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_5', 'Oster', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Ropa'),
   'Camisa de algodón', 'Camisa manga corta 100% algodón, talla M.',
   299.00, 40, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_6', 'MarcaPropia', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Videojuegos'),
   'Consola Nintendo Switch', 'Consola híbrida con dos controles Joy-Con.',
   6499.00, 6, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_7', 'Nintendo', 'activo'),
  ((SELECT id_categoria FROM categorias WHERE nombre = 'Deportes'),
   'Bicicleta de montaña', 'Bicicleta MTB 21 velocidades, rodada 27.5.',
   5499.00, 4, 'https://drive.google.com/uc?export=view&id=REEMPLAZAR_ID_8', 'MarcaMTB', 'activo');

-- Domicilio del comprador (México) ----------------------------
INSERT INTO domicilios
  (id_cliente, nombre, calle, numero, colonia, codigo_postal, municipio, estado, telefono_contacto)
VALUES
  ((SELECT id_cliente FROM clientes WHERE correo = 'comprador@tianguisdigital.mx'),
   'María García López', 'Av. Chapultepec', '123', 'Centro', '44100',
   'Guadalajara', 'Jalisco', '3312345678');
