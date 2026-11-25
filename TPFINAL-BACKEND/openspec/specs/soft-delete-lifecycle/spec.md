# soft-delete-lifecycle Specification

## Purpose

Define el ciclo de baja lógica compartido por todos los recursos del complejo, de modo que el historial se conserve en MySQL sin que los registros retirados sigan operando como vigentes.

## Requirements

### Requirement: Columna de baja lógica por tabla
El sistema SHALL conservar un campo `deletedAt` nullable en cada recurso del complejo y NO SHALL borrar físicamente registros como consecuencia de operaciones HTTP.

#### Scenario: DELETE conserva la fila
- **WHEN** un cliente ejecuta un DELETE autorizado sobre cualquier recurso
- **THEN** la fila permanece en MySQL con `deletedAt` no nulo y sin borrado físico

#### Scenario: Registro dado de baja no figure como vigente
- **WHEN** un registro tiene `deletedAt` no nulo
- **THEN** el sistema no lo devuelve en listados, detalles ni operaciones de negocio posteriores

### Requirement: Ocultamiento y respuesta 404
El sistema SHALL excluir de consultas y operaciones los registros con `deletedAt` no nulo, y SHALL responder `404` cuando un identificador corresponda a un registro inexistente o dado de baja.

#### Scenario: Consulta de un registro bajado
- **WHEN** un cliente solicita el detalle de un identificador dado de baja
- **THEN** el sistema responde `404` y no revela los datos del registro

#### Scenario: Operación sobre un registro bajado
- **WHEN** un cliente intenta actualizar, inscribir, reservar o bajar nuevamente un identificador dado de baja
- **THEN** el sistema responde `404` y no modifica ningún registro

#### Scenario: Identificador inválido
- **WHEN** el identificador de ruta no es un entero positivo
- **THEN** el sistema responde `400`

### Requirement: Migración idempotente del esquema
El sistema SHALL agregar la columna `deletedAt` a las tablas existentes durante la inicialización de modelos, solo cuando la columna no exista, sin alterar otras columnas ni datos.

#### Scenario: Tabla sin columna de baja
- **WHEN** el sistema inicializa los modelos sobre una base existente que no tiene `deletedAt` en alguna tabla
- **THEN** agrega la columna nullable y conserva las filas y restricciones existentes

#### Scenario: Tabla ya migrada
- **WHEN** el sistema inicializa los modelos sobre una tabla que ya tiene `deletedAt`
- **THEN** no intenta agregar la columna ni modificar el esquema de esa tabla

### Requirement: Unicidad histórica
El sistema SHALL conservar las restricciones únicas de email, reserva/partido e inscripción cuando una fila relacionada esté dada de baja, y SHALL responder `409` antes de intentar una inserción que las viole.

#### Scenario: Email de usuario bajado
- **WHEN** se intenta crear un usuario con el email de una cuenta dada de baja
- **THEN** el sistema responde `409` y no crea una segunda cuenta

#### Scenario: Partido bajado sobre una reserva
- **WHEN** se intenta crear un partido sobre una reserva cuyo partido anterior fue dado de baja
- **THEN** el sistema responde `409` y no crea otro partido

#### Scenario: Inscripción bajada
- **WHEN** un jugador dado de baja de un partido intenta inscribirse nuevamente en ese mismo partido
- **THEN** el sistema responde `409` y no crea una segunda inscripción
