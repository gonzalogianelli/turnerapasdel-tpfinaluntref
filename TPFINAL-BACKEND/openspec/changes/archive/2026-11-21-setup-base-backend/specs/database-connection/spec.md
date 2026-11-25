# Spec Delta

## Purpose

Define cómo el sistema establece, verifica y cierra la conexión con MySQL mediante Sequelize, de modo que todos los módulos comparten una única fuente de conexión y pueden comprobar su disponibilidad.

## ADDED Requirements

### Requirement: Conexión a MySQL con Sequelize
El sistema SHALL configurar una conexión a MySQL usando `mysql2` como driver de Sequelize, tomando host, puerto, nombre de base, usuario y contraseña desde la configuración centralizada. La conexión NO SHALL usar credenciales hardcodeadas.

#### Scenario: Conexión configurada correctamente
- **WHEN** el servidor inicia con credenciales de MySQL válidas
- **THEN** Sequelize se inicializa con esas credenciales y queda disponible para los módulos de negocio

#### Scenario: Credenciales ausentes
- **WHEN** faltan datos requeridos de conexión a MySQL
- **THEN** el sistema falla al iniciar con un error claro en lugar de intentar conectar con valores por defecto inseguros

### Requirement: Verificación del estado de la base de datos
El sistema SHALL exponer una operación reutilizable que verifique activamente la conectividad con MySQL mediante una consulta de prueba y devuelva un resultado de disponible o no disponible sin lanzar una excepción no controlada al llamador.

#### Scenario: Base de datos disponible
- **WHEN** se ejecuta la verificación y MySQL responde correctamente
- **THEN** la operación reporta la base de datos como disponible

#### Scenario: Base de datos no disponible
- **WHEN** se ejecuta la verificación y MySQL rechaza o no responde
- **THEN** la operación reporta la base de datos como no disponible y el error se registra en el log

### Requirement: Cierre ordenado de la conexión
El sistema SHALL cerrar la conexión a la base de datos cuando el proceso recibe una señal de terminación, liberando el pool de conexiones antes de finalizar.

#### Scenario: Apagado del servidor
- **WHEN** el proceso recibe `SIGINT` o `SIGTERM`
- **THEN** el servidor deja de aceptar solicitudes, cierra la conexión Sequelize y finaliza sin dejar conexiones abiertas

#### Scenario: Error durante el cierre
- **WHEN** el cierre de la conexión falla
- **THEN** el error se registra y el proceso finaliza de forma controlada
