# Spec Delta

## ADDED Requirements

### Requirement: Límite de intentos fallidos de login
El sistema SHALL limitar únicamente `POST /api/auth/login` por dirección IP: después de 3 respuestas `401` dentro de una ventana de 15 minutos, esa IP SHALL recibir `429` en el login hasta que venza la ventana. Un login correcto SHALL limpiar el contador de esa IP. El límite NO SHALL aplicarse a otras rutas ni a otras IP.

#### Scenario: Tres fallos consecutivos
- **WHEN** una IP envía tres veces credenciales inválidas a `POST /api/auth/login` dentro de la ventana
- **THEN** las tres respuestas son `401` con el mensaje genérico de credenciales inválidas

#### Scenario: Bloqueo temporal tras el tercer fallo
- **WHEN** la misma IP realiza un cuarto intento de login antes de que venza la ventana de 15 minutos
- **THEN** el sistema responde `429` con `{ "status": "error", "message": "..." }` sin emitir cookie, aunque las credenciales sean correctas

#### Scenario: Login correcto limpia el contador
- **WHEN** una IP con uno o dos fallos previos envía credenciales válidas y obtiene `200`
- **THEN** el contador de esa IP queda en cero y necesita tres nuevos fallos para volver a ser bloqueada

#### Scenario: Expiración de la ventana
- **WHEN** transcurre la ventana de 15 minutos desde los fallos registrados para una IP
- **THEN** esa IP puede volver a intentar login y un intento fallido responde `401` en lugar de `429`

#### Scenario: Aislamiento por IP y por endpoint
- **WHEN** una IP distinta intenta login, o cualquier cliente consulta otra ruta de la API
- **THEN** no se aplica el contador de intentos fallidos ni se devuelve `429` por este motivo
