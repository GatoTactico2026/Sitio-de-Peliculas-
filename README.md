# Proyecto de Peliculas

Aplicacion web con Express, MongoDB y Passport para registrar usuarios y administrar peliculas.

## Requisitos

- Node.js
- MongoDB ejecutandose en `mongodb://127.0.0.1:27017/moviesDB`

## Instalacion

```bash
npm install
```

## Ejecucion

```bash
node app.js
```

Servidor disponible en `http://0.0.0.0:8080`.

## Estructura principal

- `app.js`: rutas, autenticacion, render HTML y validacion de entradas.
- `Model/movie.js`: esquema de peliculas.
- `Model/user.js`: esquema de usuarios.
- `pelicula/`: vistas estaticas y scripts del frontend.

## Validaciones de seguridad

Se agregaron controles en cliente y servidor para reducir entradas maliciosas y datos excesivos.

### Reglas aplicadas

- Longitud maxima de 100 caracteres en campos de texto de peliculas y registro.
- Rechazo de entradas con etiquetas HTML, eventos inline, `script` o `javascript:`.
- Rechazo de patrones comunes de inyeccion como `UNION SELECT`, `DROP TABLE`, `DELETE FROM`, `UPDATE ... SET`, `--`, `/*` y `$where`.
- Normalizacion con `trim()` antes de guardar.

### Donde se valida

- Servidor: `app.js`
- Esquemas de MongoDB: `Model/movie.js` y `Model/user.js`
- Formularios del cliente:
  - `pelicula/new.html`
  - `pelicula/edit.html`
  - `pelicula/register.html`
  - `pelicula/js/new.js`
  - `pelicula/js/edit.js`

## Flujo de peliculas

- `GET /movies`: lista de peliculas.
- `GET /movies/new`: formulario para crear una pelicula.
- `POST /movies`: crea una pelicula asociada al usuario autenticado.
- `GET /movies/:id/edit`: formulario de edicion.
- `POST /movies/:id`: actualiza una pelicula.
- `POST /movies/:id/delete`: elimina una pelicula.

## Autenticacion

- `GET /register` y `POST /register`: registro de usuario.
- `GET /login` y `POST /login`: inicio de sesion.
- `GET /logout`: cierre de sesion.

## Notas

- El escape de salida HTML sigue realizandose al renderizar contenido en `app.js`.
- Las validaciones del frontend mejoran la experiencia, pero la validacion definitiva esta en el servidor.
- El proyecto no incluye pruebas automaticas para estos flujos por ahora.