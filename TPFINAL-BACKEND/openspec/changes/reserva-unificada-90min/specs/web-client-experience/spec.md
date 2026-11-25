# Specs del cambio — Cliente web

## ADDED Requirements

### Requirement: Vista única de Reserva
El cliente SHALL mostrar un único flujo llamado Reserva con día, horario y cancha, sin pantalla ni menú independiente de Turnos.

#### Scenario: Usuario sin sesión
- **WHEN** se abre la aplicación
- **THEN** se muestran los turnos libres del día actual con selector de fechas y acceso visible a login/registro

#### Scenario: Confirmación sin sesión
- **WHEN** un visitante intenta confirmar una reserva
- **THEN** se lo lleva a Login y su selección se retoma al volver

#### Scenario: Grilla por cancha
- **WHEN** se elige una fecha
- **THEN** se muestran los turnos libres de cada cancha por separado y desaparecen los ocupados

### Requirement: Perfil enfocado
El perfil SHALL ofrecer acceso directo a Reservar, edición de datos y avisos de partidos compatibles con la categoría del jugador, sin una opción separada de Turnos.

#### Scenario: Partido compatible
- **WHEN** existe un partido incompleto con categoría igual o adyacente a la del jugador
- **THEN** se muestra un aviso visible en el perfil
