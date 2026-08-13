# Tianguis Digital

Marketplace mexicano de comercio electrónico. El mercado de México, a un clic.

## Descripcion

Plataforma digital para comercializar productos dentro de México: los vendedores
publican productos y los compradores consultan el catálogo, buscan, filtran,
agregan artículos al carrito y generan solicitudes de pedido. El proceso de pago
es simulado.

## Objetivo

Desarrollar una aplicación web funcional que permita administrar y consultar un
catálogo de productos y simular el proceso básico de compra dentro de México,
usando PostgreSQL como base de datos, Google Drive institucional para las
imágenes y Git/GitHub para el control de versiones.

## Tecnologias utilizadas

| Capa | Tecnologia |
|---|---|
| Frontend | HTML5, CSS3, Bootstrap 5, JavaScript (fetch API) |
| Backend | Node.js + Express |
| Base de datos | PostgreSQL 16 |
| Autenticacion | bcryptjs (hash) + jsonwebtoken (sesiones) |
| Imagenes | Google Drive institucional |
| Control de versiones | Git + GitHub |

## Requisitos

- Node.js 18 o superior
- PostgreSQL 16
- Git
- Cuenta institucional Google Drive (@utdelacosta.edu.mx)
- Cuenta de GitHub

## Instalacion

### 1. Clonar el repositorio

```bash
git clone https://github.com/luismanuel57/marketplace-mexico.git
cd marketplace-mexico
```

### 2. Backend

```bash
cd backend
npm install
copy .env.example .env   # Windows
```

Completar el archivo `.env` con tus datos.

### 3. Base de datos (PostgreSQL)

```bash
# Crear la base de datos (una sola vez)
psql -U postgres -c "CREATE DATABASE tianguis_digital OWNER tianguis;"

# Crear estructura y datos de prueba
psql -U tianguis -h localhost -d tianguis_digital -f database/create_database.sql
psql -U tianguis -h localhost -d tianguis_digital -f database/data.sql
```

### 4. Ejecutar el backend

```bash
cd backend
npm run dev
```

La API queda disponible en `http://localhost:3000`. Prueba de conexión:
`http://localhost:3000/api/estado`.

### 5. Frontend

Abrir `frontend/index.html` en el navegador (o servir la carpeta `frontend/`
con un servidor estático).

## Configuracion de PostgreSQL

Variables en `backend/.env`:

| Variable | Valor de ejemplo |
|---|---|
| `DB_HOST` | `localhost` |
| `DB_PORT` | `5432` |
| `DB_NAME` | `tianguis_digital` |
| `DB_USER` | `tianguis` |
| `DB_PASSWORD` | `tianguis123` |

## Configuracion de Google Drive

Las imágenes de los productos NO se almacenan en PostgreSQL. Se alojan en una
carpeta de Google Drive institucional (`Marketplace-Mexico`) organizada por
categorías, y la base de datos guarda únicamente la referencia (`imagen_url`)
con el formato:

```
https://drive.google.com/uc?export=view&id=<ID_DEL_ARCHIVO>
```

## Usuarios de prueba

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@tianguisdigital.mx` | `12345` |
| Cliente | `comprador@tianguisdigital.mx` | `12345` |

## Funcionalidades

- Página principal con identidad visual propia.
- Catálogo con búsqueda y filtros (categoría, precio mínimo/máximo, disponibilidad).
- Detalle del producto con información del vendedor.
- Carrito: agregar, modificar cantidades, eliminar, subtotal y total.
- Solicitud de pedido y consulta de pedidos.
- Pago simulado con tarjeta de prueba (los datos no se envían ni se almacenan).
- Panel de administración: productos, categorías, usuarios y estados de pedidos.
- Formato mexicano: precios en MXN, estados de la República, códigos postales.

## Capturas de pantalla

*(Se agregan al finalizar la interfaz.)*

## URL de implementacion

Despliegue local: backend en `http://localhost:3000`, frontend en la carpeta
`frontend/`.
