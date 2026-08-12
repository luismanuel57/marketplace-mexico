# Coleccion de Bruno - Tianguis Digital

Coleccion con todos los endpoints de la API para probar con [Bruno](https://www.usebruno.com/).

## Como abrirla

1. Abre Bruno.
2. Menu superior: `File` -> `Open Collection`.
3. Selecciona la carpeta `bruno/` de este proyecto.
4. La coleccion aparece con sus 9 carpetas ordenadas.

## Configuracion del environment

La coleccion usa variables del **environment activo** (carpeta `bruno/environments/`):

1. Abre la coleccion en Bruno.
2. En la barra superior, selecciona el environment **Local** (desplegable junto al boton de run).
3. Ejecuta `02_Auth -> 02_Login_Comprador` o `03_Login_Admin`.
4. El script post-response guarda automaticamente el `token` devuelto en la variable de environment `token`. No necesitas copiar nada.

El environment `environments/Local.bru` define:

```bru
vars {
  apiUrl: http://localhost:3000/api
  token: ""
}
```

> Nota: si el environment no esta seleccionado, los endpoints protegidos daran 401. El login y el guardado del token requieren el environment activo. La precedencia en Bruno es: request > environment > collection.

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
