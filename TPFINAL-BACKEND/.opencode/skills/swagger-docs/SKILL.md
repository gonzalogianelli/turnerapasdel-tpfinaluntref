---
name: swagger-docs
description: Documentación OpenAPI 3.0 con swagger-jsdoc y swagger-ui-express para todos los endpoints de la API REST.
---

# Estándar de Documentación Swagger

1. Exponer la interfaz interactiva en `/api-docs` y el JSON en `/api-docs.json`.
2. Definir `components.securitySchemes.cookieAuth` con `type: apiKey`, `in: cookie`, `name: padel_token`.
3. Todo endpoint creado o modificado debe incluir bloques JSDoc `@swagger` detallando:
   - Tag del módulo (`Auth`, `Jugadores`, `Canchas`, `Turnos`, `Reservas`, `Partidos`).
   - Seguridad (`cookieAuth`) cuando corresponda.
   - Parámetros de ruta (`in: path` para `req.params`) y parámetros de consulta (`in: query` para `req.query`).
   - Esquema de `requestBody` y respuestas (`200`, `201`, `400`, `401`, `403`, `404`, `409`).
