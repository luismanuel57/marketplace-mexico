# Coleccion de Bruno - Tianguis Digital

Coleccion con todos los endpoints de la API para probar con [Bruno](https://www.usebruno.com/).

## Como abrirla

1. Abre Bruno.
2. Menu superior: `File` -> `Open Collection`.
3. Selecciona la carpeta `bruno/` de este proyecto.
4. La coleccion aparece con sus 9 carpetas ordenadas.

## Configuracion del token

La coleccion usa la variable `{{token}}` para los endpoints protegidos:

1. Ejecuta `02_Auth -> 03_Login_Admin` (o `02_Login_Comprador`).
2. Copia el `token` de la respuesta.
3. En Bruno: `Collections -> Tianguis Digital -> ...` edita las variables de coleccion y pega el token en `token`.

## Orden sugerido de pruebas

1. `01_Estado`: comprobar que el backend responde.
2. `02_Auth`: registrar un usuario y hacer login (comprador y admin).
3. `03_Articulos`: consultas (listar, buscar, filtros, detalle) y CRUD con token de admin.
4. `04_Categorias`: listar y administrar categorias.
5. `05_Bolsa`: ver, agregar, cambiar cantidad y eliminar.
6. `06_Ordenes`: crear pedido, mis pedidos, detalle, y con admin: todas y cambiar estado.
7. `07_Clientes` (admin) y `08_Domicilios`.
8. `09_Errores`: verificar validaciones y codigos HTTP (401, 400, 409).

> Nota: en rutas con `/1` (ej. `/articulos/1`, `/bolsa/articulos/1`) cambia el id por uno real de tu base de datos.

## Requisito

El backend debe estar corriendo (`cd backend; npm run dev`). La variable `apiUrl` de la coleccion ya apunta a `http://localhost:3000/api`; ajustala en `collection.bru` si usas otro puerto.
