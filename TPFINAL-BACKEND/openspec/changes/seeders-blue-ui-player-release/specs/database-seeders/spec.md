# Spec Delta

## Purpose

La carga inicial de cuentas del complejo debe ser reproducible, segura y ejecutable tantas veces como sea necesario sin duplicar usuarios ni depender de datos manuales.

## ADDED Requirements

### Requirement: Cuentas iniciales del complejo
El sistema SHALL crear, mediante el comando documentado `npm run seed`, un administrador dueño, dos empleados con rol `administrador` y seis jugadores con rol `jugador`, usando emails únicos y credenciales documentadas para el ingreso.

#### Scenario: Primera ejecución del seeder
- **WHEN** se ejecuta `npm run seed` sobre un esquema sin esas cuentas
- **THEN** el sistema crea nueve usuarios vigentes con los roles indicados y permite iniciar sesión con las credenciales documentadas

#### Scenario: Campos obligatorios de los usuarios sembrados
- **WHEN** se crea cualquier cuenta del seeder
- **THEN** la cuenta incluye `nombre`, `email`, `categoria`, `posicionHabitual`, `manoDominante`, `sexo` y `telefono` válidos

#### Scenario: Contraseñas de las cuentas sembradas
- **WHEN** se consulta una cuenta creada por el seeder directamente en MySQL
- **THEN** el campo `password` contiene un hash `bcryptjs` y nunca el texto plano documentado

#### Scenario: Empleados con rol administrador
- **WHEN** se consultan los dos empleados creados por el seeder
- **THEN** ambos tienen `rol` igual a `administrador` y ninguno usa un rol `empleado`

### Requirement: Nombres reales de las cuentas sembradas
El sistema SHALL usar nombres y apellidos reales y variados en las nueve cuentas sembradas, sin nombres genéricos ni marcadores de prueba.

#### Scenario: Nombres de las cuentas iniciales
- **WHEN** se inspeccionan los `nombre` de los nueve usuarios creados por `npm run seed`
- **THEN** cada uno contiene un nombre y un apellido distintos de los demás y ninguno corresponde a un marcador genérico o de prueba

### Requirement: Canchas iniciales del complejo
El sistema SHALL crear, mediante `npm run seed`, exactamente dos canchas iniciales llamadas `Cancha 1 — Central` y `Cancha 2 — Blindex`, sin limitar las altas o bajas posteriores que realice el administrador.

#### Scenario: Primera ejecución con canchas vacías
- **WHEN** se ejecuta `npm run seed` sobre un esquema sin canchas
- **THEN** el sistema crea esas dos canchas y ninguna otra

#### Scenario: Segunda ejecución sin duplicados
- **WHEN** se ejecuta `npm run seed` nuevamente
- **THEN** no se crea ninguna cancha duplicada y las dos iniciales siguen vigentes

#### Scenario: Cancha inicial dada de baja
- **WHEN** una de las dos canchas iniciales existe con `deletedAt` no nulo
- **THEN** el seeder la restaura sin crear una fila adicional

#### Scenario: Canchas adicionales del administrador
- **WHEN** el administrador crea otra cancha o da de baja una cancha inicial antes de ejecutar el seeder
- **THEN** el seeder conserva la cancha adicional y no limita ni revierte la baja de canchas con turnos activos

### Requirement: Ejecución idempotente del seeder
El sistema SHALL poder ejecutar `npm run seed` repetidamente sin duplicar cuentas, sin cambiar contraseñas de cuentas vigentes ya existentes y sin fallar por emails previamente registrados.

#### Scenario: Segunda ejecución sin cambios
- **WHEN** se ejecuta `npm run seed` dos veces seguidas
- **THEN** el número total de usuarios sembrados sigue siendo nueve y no se crea ningún email duplicado

#### Scenario: Cuenta vigente ya existente
- **WHEN** el email de una cuenta del seeder ya pertenece a un usuario vigente
- **THEN** el seeder conserva esa cuenta y su contraseña sin modificarla, y actualiza sus campos sembrados si aún tenían nombres genéricos

#### Scenario: Cuenta sembrada dada de baja
- **WHEN** una cuenta del seeder existe con `deletedAt` no nulo
- **THEN** el seeder la restaura con sus credenciales documentadas y sin crear una fila adicional

### Requirement: Aislamiento de notificaciones del seeder
El sistema NO SHALL enviar correos durante la ejecución del seeder, y las cuentas sembradas SHALL usar direcciones reservadas que no generen envíos SMTP reales.

#### Scenario: Ejecución sin SMTP configurado
- **WHEN** se ejecuta `npm run seed` sin variables SMTP
- **THEN** la carga termina correctamente y no intenta enviar correos

#### Scenario: Dominio reservado de las cuentas
- **WHEN** se inspeccionan los emails de las cuentas sembradas
- **THEN** todos pertenecen al dominio reservado `padel.example`

### Requirement: Documentación operativa del seeder
El sistema SHALL documentar en `README.md` el comando `npm run seed`, las nueve credenciales creadas y el hecho de que el comando es idempotente.

#### Scenario: Consulta de la documentación
- **WHEN** un administrador lee el `README.md` del backend
- **THEN** encuentra el comando de carga y el listado de emails y contraseñas de dueño, empleados y jugadores

#### Scenario: Uso de credenciales documentadas
- **WHEN** un administrador usa una credencial listada en el `README.md` en `POST /api/auth/login`
- **THEN** el sistema responde `200`, establece la cookie HTTPOnly y devuelve el perfil con el rol documentado
