# Spec Delta

## ADDED Requirements

### Requirement: Health no consume presupuesto de rate limiting
El endpoint de salud SHALL estar exento del rate limiter global tanto para `/api/health` como para `/api/health/`, de modo que los chequeos de disponibilidad no sean bloqueados por tráfico previo del mismo cliente.

#### Scenario: Health con barra final
- **WHEN** un cliente consulta `/api/health/` después de agotar el límite de peticiones en otra ruta
- **THEN** la solicitud NO es contabilizada ni rechazada por el rate limiter y devuelve el estado del servidor

#### Scenario: Health sin barra final
- **WHEN** un monitor consulta `/api/health`
- **THEN** la solicitud NO incrementa el contador global de peticiones limitadas

### Requirement: Health documentado en OpenAPI
El documento OpenAPI SHALL incluir `GET /api/health` con un `operationId`, resumen, descripción y respuestas `200` y `500` con el esquema de estado del servidor.

#### Scenario: Consulta del documento OpenAPI
- **WHEN** un cliente obtiene `/api-docs.json`
- **THEN** el documento incluye la operación `GET /api/health` con sus respuestas documentadas
