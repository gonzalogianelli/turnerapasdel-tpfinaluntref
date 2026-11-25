# Spec Delta: app-foundation

## MODIFIED Requirements

### Requirement: Documentación interactiva de la API
El sistema SHALL exponer la documentación OpenAPI de la API en `/api-docs` (interfaz interactiva) y `/api-docs.json` (documento OpenAPI), incluyendo el esquema de seguridad `cookieAuth` para la cookie de sesión, y NO SHALL exigir autenticación para consultar la documentación. La documentación SHALL incluir todos los endpoints de baja lógica con sus parámetros de ruta y sus respuestas `400`, `401`, `403`, `404` y `409` cuando correspondan.

#### Scenario: Interfaz de documentación disponible
- **WHEN** un cliente solicita `GET /api-docs` sin sesión
- **THEN** el sistema responde con la interfaz interactiva de Swagger UI

#### Scenario: Documento OpenAPI disponible
- **WHEN** un cliente solicita `GET /api-docs.json`
- **THEN** el sistema responde `200` con un documento OpenAPI que describe los endpoints y el esquema de seguridad `cookieAuth`

#### Scenario: Endpoints documentados con parámetros y respuestas
- **WHEN** se consulta el documento OpenAPI
- **THEN** los endpoints de autenticación, usuarios, canchas, turnos y reservas incluyen sus parámetros de ruta y consulta y las respuestas de éxito y error correspondientes

#### Scenario: Endpoints de baja documentados
- **WHEN** se consulta el documento OpenAPI
- **THEN** los DELETE de usuarios, canchas, turnos, reservas, partidos e inscripciones incluyen `cookieAuth`, parámetros de ruta y respuestas `200`, `400`, `401`, `403`, `404` y `409` según corresponda

## ADDED Requirements

### Requirement: Ejemplos de correo en OpenAPI
Los ejemplos de campos de email en la documentación OpenAPI NO SHALL usar dominios de ejemplo reservados y SHALL indicar que se debe usar una dirección real válida.

#### Scenario: Ejemplos de email no entregables
- **WHEN** se consulta el documento OpenAPI
- **THEN** los esquemas de email no contienen `ana@example.com` ni dominios de ejemplo reservados e indican usar una dirección real válida
