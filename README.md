# traducontextfront

Web de TraduContext (Angular 21 + Tailwind CSS 4). Consume la API de `traducontextback`.

Antes de arrancar la web, el backend tiene que estar corriendo en el puerto 8000 (ver el README
de `traducontextback`).

## Requisitos

- Node.js 20.19+, 22.12+ o 24 (probado con 24) y npm.

## 1. Instalación

```powershell
cd traducontextfront
npm install
```

## 2. Configuración

**URL del backend:** está en `src/environments/`.

| Archivo | Se usa en | `apiUrl` |
|---------|-----------|----------|
| `environment.development.ts` | `npm start` | `http://127.0.0.1:8000/api/v1` |
| `environment.ts` | `npm run build` (producción) | Sustituir `https://api.tudominio.com/api/v1` por la URL real antes de publicar. |

**Firebase (obligatorio para compilar):** `src/environments/firebase.ts` no se versiona, pero el
código lo importa. Créalo a partir del ejemplo:

```powershell
copy src\environments\firebase.example.ts src\environments\firebase.ts
```

- Si lo dejas con los valores vacíos, la web funciona igual, pero sin notificaciones push.
- Para activarlas, rellénalo con la configuración de la **app web** (Firebase → Configuración
  del proyecto → Tus apps → Web; no son los valores de `google-services.json`) y con `vapidKey`
  (Cloud Messaging → Certificados web push). El backend también necesita `FIREBASE_CREDENCIALES`.
- `public/firebase-messaging-sw.js` muestra las notificaciones con la pestaña cerrada. No contiene
  datos del proyecto: recibe la configuración al registrarse.

En `CREDENCIALES.md` del repo `traducontextback` se explica el detalle de todas las credenciales
del sistema y cómo circulan.

## 3. Ejecutar

```powershell
npm start
```

Abre `http://localhost:4200`. La web y el móvil pueden usar el mismo backend a la vez.

## Otros comandos

| Comando | Qué hace |
|---------|----------|
| `npm run build` | Compila para producción en `dist/` (no se versiona). |
| `npm test` | Pruebas unitarias con Vitest. |
| `npx prettier --write src` | Formatea el código. |

## Estructura (`src/app/`)

| Carpeta | Contenido |
|---------|-----------|
| `core/` | Servicios HTTP, modelos, guards, interceptores (token Bearer), configuración y push web. |
| `layouts/` | Carcasa de las pantallas autenticadas. |
| `components/` | Header y sidebar. |
| `views/` | Pantallas, una carpeta por módulo. |
| `app.routes.ts` | Rutas. Cada vista nueva se registra aquí y, si corresponde, en el sidebar. |
