---
name: sdd-workflow
description: Workflow estricto de Specification-Driven Development (SDD) con OpenSpec, AGENTS.md y skills del proyecto para trabajar un módulo a la vez sin improvisar.
---

# Workflow Estricto SDD y Uso de Skills

## 1. Regla de oro al iniciar cualquier turno o tarea
1. Leer `AGENTS.md` y verificar qué skills del proyecto aplican al módulo activo (`express-esm-mysql`, `auth-rbac`, `padel-domain`, `swagger-docs`, `sdd-workflow`).
2. Respetar estrictamente el alcance del módulo actual y las reglas de negocio de un único complejo de pádel.
3. No adelantar código de módulos posteriores ni inventar requisitos fuera de `AGENTS.md`, las skills o la spec aprobada.

## 2. Paso a paso cuando se invoca o aplica una skill
- **Identificar la skill relevante:**
  - `express-esm-mysql`: siempre que se cree o modifique configuración, conexión MySQL/Sequelize, rutas, controladores, servicios, modelos, transacciones o manejo de errores.
  - `auth-rbac`: siempre que se trabaje con registro, login, logout, JWT en cookie `HTTPOnly`, `bcryptjs`, middlewares de autenticación o control de roles (`administrador` y `jugador`).
  - `padel-domain`: siempre que se toquen categorías, canchas, turnos de 90 minutos, estados de turno, solicitudes/reservas, cancelaciones, republicación manual o partidos incompletos.
  - `swagger-docs`: siempre que se creen o modifiquen endpoints de la API REST.
  - `sdd-workflow`: en todo el ciclo de planificación, ejecución, verificación y cierre de un módulo.
- **Aplicar sus reglas antes de editar:**
  - Verificar ESM (`import`/`export` con extensión `.js` en imports relativos).
  - Verificar manejo de errores con `AppError` + `next(err)` y middleware global.
  - Verificar seguridad, roles, estados y concurrencia según corresponda.

## 3. Ciclo obligatorio por módulo (4 fases)

### Fase 1: Propuesta y planificación (`proposal.md`, `specs/`, `design.md`, `tasks.md`)
- Generar la documentación del cambio en OpenSpec (`openspec/changes/<nombre-cambio>/`).
- **Freno de código:** Si el usuario pide solo planificar o aún no aprobó `tasks.md`, **no crear ni modificar código de aplicación en `src/`**.
- Dejar `tasks.md` claro, ordenado y acotado únicamente al módulo en curso.

### Fase 2: Revisión del usuario (puerta de aprobación)
- Esperar a que el usuario revise `tasks.md` y el diseño.
- Si el usuario solicita ajustes en la spec o en las tareas, actualizar los archivos de OpenSpec antes de implementar.

### Fase 3: Implementación controlada
- Ejecutar las tareas aprobadas de `tasks.md` una por una siguiendo las skills correspondientes.
- Mantener el código limpio, modular y coherente con `AGENTS.md`.
- Informar al final qué archivos se crearon o modificaron y qué quedó pendiente de verificación manual.

### Fase 4: Verificación, archivo y commit
- El módulo solo se da por cerrado cuando el usuario prueba el servidor/endpoints y verifica el estado en MySQL Workbench.
- Una vez aprobado el cierre, archivar el cambio en OpenSpec (`openspec archive <nombre-cambio>`) y sugerir el mensaje de commit en Git.
