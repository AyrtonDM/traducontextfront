# Traducontextfront

This project was generated using [Angular CLI](https://github.com/angular/angular-cli) version 21.2.21.

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

To execute unit tests with the [Vitest](https://vitest.dev/) test runner, use the following command:

```bash
ng test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.


# SOBRE LA ORGANIZACION DE LAS CARPETAS

# src/app/core/

Contiene la lógica y los elementos centrales de la aplicación.

Los elementos incluidos aquí normalmente son utilizados por diferentes partes del sistema y no pertenecen exclusivamente a una vista.

core/
??? configuracion/
??? servicios/
??? interceptores/
??? guards/

# core/configuration/

Contiene configuraciones relacionadas con el funcionamiento de la aplicación.
Ejemplos:

api.config.ts

Puede contener configuraciones como:

URL base de la API.
Configuraciones generales para las peticiones.
Configuraciones relacionadas con servicios externos.

No se deben colocar aquí variables específicas de una sola vista.

# core/services/

Contiene los servicios Angular encargados de implementar la lógica de comunicación y operaciones principales.

Ejemplos:

autenticacion.service.ts
usuario.service.ts
traduccion.service.ts

Los servicios pueden encargarse de:

Realizar peticiones HTTP al backend.
Registrar usuarios.
Iniciar y cerrar sesión.
Recuperar contraseñas.
Obtener información del usuario.
Enviar solicitudes de traducción.
Procesar operaciones reutilizadas por varias vistas.

Las vistas no deben realizar directamente las peticiones HTTP al backend cuando estas puedan ser encapsuladas en un servicio.

# core/interceptores/

Contiene los interceptores HTTP de Angular.

Los interceptores permiten modificar o procesar automáticamente las peticiones y respuestas HTTP.

Ejemplo:

autenticacion.interceptor.ts

Puede utilizarse para:

Agregar el token de autenticación a las peticiones.
Procesar determinados errores HTTP.
Realizar acciones comunes antes de enviar una petición.

# core/guards/

Contiene los guards utilizados para controlar el acceso a las rutas.

Ejemplo:

autenticacion.guard.ts

Un guard puede verificar si el usuario está autenticado antes de permitir el acceso a una vista.

Ejemplo:

/traduccion
      ?
authentication.guard
      ?
¿Usuario autenticado?
   ??? Sí ? permitir acceso
   ??? No ? iniciar sesión


# src/app/components/

Contiene componentes reutilizables de la interfaz.

Un componente debe estar aquí cuando puede ser utilizado en diferentes vistas o cuando representa un elemento independiente de la interfaz.

Ejemplos:

componentes/
??? encabezado/
??? menu/
??? boton/
??? campo-texto/
??? selector-idioma/
??? mensaje-error/

Ejemplos de elementos que pueden estar aquí:

Encabezado.
Menú de navegación.
Botones personalizados.
Campos de formulario.
Selector de idioma.
Mensajes de error.
Modales.
Indicadores de carga.
Regla

Si un componente pertenece exclusivamente a una vista y no tiene sentido reutilizarlo fuera de ella, debe permanecer dentro de la carpeta de esa vista.

Si es reutilizable, debe considerarse para componentes/.

# src/app/views/

Contiene las páginas o pantallas principales de la aplicación.

Cada carpeta representa una vista funcional del sistema.

Ejemplo:

vistas/
??? inicio/
??? iniciar-sesion/
??? registrar-usuario/
??? recuperar-contrasena/
??? traduccion/

Las vistas pueden contener:

Componentes propios de la página.
Formularios específicos.
HTML de la página.
Lógica relacionada exclusivamente con esa vista.
Estilos específicos de la vista.

Ejemplo:

vistas/
??? iniciar-sesion/
    ??? iniciar-sesion.component.ts
    ??? iniciar-sesion.component.html
    ??? iniciar-sesion.component.css

Las vistas utilizan los servicios de core/servicios/ para comunicarse con el backend.