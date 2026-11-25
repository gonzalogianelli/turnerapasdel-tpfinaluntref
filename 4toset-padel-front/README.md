# 4to set padel — Frontend

React + Vite + JavaScript con CSS propio. Consume la API Express en `http://localhost:3000` usando cookies HTTPOnly (`credentials: 'include'`).

## Ejecutar

```bash
npm install
npm run dev
```

La app queda en `http://localhost:5173`. Para cambiar la API, copiá `.env.example` a `.env` y ajustá `VITE_API_URL`.

## Build

```bash
npm run build
npm run preview
```

## Identidad visual

La interfaz usa una paleta azul: azul profundo para navegación y paneles, azul cancha para acentos y estados activos, y superficies claras para tablas y formularios. El motif de líneas de cancha aparece en el acceso, el panel, las tarjetas de cancha, los encabezados de sección y los formularios.

El diseño es responsive: las tablas tienen desplazamiento horizontal, los modales se compactan en pantallas chicas y los campos de foco mantienen contraste visible.

## Acceso y cuentas

No hay credenciales precargadas ni botones de autocompletado en el frontend. El formulario de ingreso arranca vacío y la contraseña puede mostrarse u ocultarse con un control accesible.

El registro público crea solo cuentas de `jugador`. Las cuentas de `administrador` se crean desde el seeder del backend o desde el alta administrativa; consultá el README del backend para el procedimiento.

La recuperación de contraseña es solo una pantalla informativa: el backend no expone un endpoint dedicado.

## Estructura

- `src/api`: cliente HTTP y catálogos.
- `src/context`: sesión y notificaciones.
- `src/components`: layout, tablas, modales y controles reutilizables.
- `src/pages`: pantallas de acceso, perfil, dashboard y gestión.
- `src/styles`: tokens, base, layout, componentes, formularios y páginas.
