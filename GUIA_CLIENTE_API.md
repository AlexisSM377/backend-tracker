# Guia Practica De Uso De La API

Esta guia contiene ejemplos practicos para consumir la API de Tracker Core desde Swagger, Postman o cualquier cliente HTTP.

Base URL local:

```text
http://localhost:3000
```

Swagger:

```text
http://localhost:3000/api/docs
```

## Autenticacion

La mayoria de endpoints requieren JWT.

Header requerido:

```http
Authorization: Bearer <access_token>
```

En Swagger:

1. Ejecutar `POST /auth/login`.
2. Copiar el `access_token`.
3. Click en **Authorize**.
4. Pegar solo el token, sin escribir `Bearer`.
5. Confirmar con **Authorize**.

### Login

```http
POST /auth/login
Content-Type: application/json
```

Body:

```json
{
  "username": "admin",
  "password": "password_seguro"
}
```

Respuesta esperada:

```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6..."
}
```

## Validar Conexion Con Wialon

Antes de probar operaciones GPS, validar que la sesion Wialon este disponible.

### Estado De Sesion

```http
GET /wialon/session/status
Authorization: Bearer <access_token>
```

Respuesta esperada:

```json
{
  "active": true,
  "sidPreview": "42bfbdc302..."
}
```

### Buscar Unidades

```http
GET /wialon/units?search=863238077362731&page=1&pageSize=50
Authorization: Bearer <access_token>
```

Uso recomendado:

- Buscar por numero de serie.
- Confirmar el `unitId` interno de Wialon.
- Confirmar que la unidad existe antes de enviar comandos o registrar instalaciones.

## Comandos GPS

Los comandos se ejecutan contra Wialon. Usar primero comandos de consulta, como `Localizar`, antes de probar comandos de motor.

### Listar Comandos De Una Unidad

```http
GET /gps/units/402245387/commands
Authorization: Bearer <access_token>
```

Respuesta ejemplo:

```json
{
  "serialNumber": null,
  "configuredCommands": [
    {
      "id": 5,
      "name": "Localizar",
      "type": "query_pos",
      "linkType": "",
      "rawLinkType": null,
      "params": "",
      "accessLevel": 1,
      "phoneFlags": 0
    }
  ],
  "availableNow": [
    {
      "name": "Localizar",
      "type": "query_pos",
      "linkType": "",
      "rawLinkType": "tcp,vrt",
      "accessLevel": 1
    }
  ]
}
```

### Ejecutar Comando Directo Por Nombre

Usar este endpoint cuando ya se conoce el nombre exacto del comando configurado en Wialon.

```http
POST /gps/units/402245387/commands/exec
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body para localizar:

```json
{
  "commandName": "Localizar",
  "linkType": "tcp",
  "param": "",
  "userId": "ccc5cd29-7b46-435e-b517-11bb202c4d1d"
}
```

Body para bloqueo de motor:

```json
{
  "commandName": "block_engine",
  "linkType": "tcp",
  "param": "",
  "userId": "ccc5cd29-7b46-435e-b517-11bb202c4d1d"
}
```

Respuesta exitosa:

```json
{
  "success": true,
  "unitId": 402245387,
  "commandName": "Localizar",
  "linkType": "tcp",
  "param": "",
  "executedAt": "2026-05-04T16:44:23.406Z",
  "executedBy": "ccc5cd29-7b46-435e-b517-11bb202c4d1d",
  "wialonResponse": {
    "status": "ok",
    "commandSent": true
  }
}
```

### Ejecutar Comando Normalizado Por Serial

Este endpoint recibe un comando logico y la API resuelve la unidad en Wialon por `serialNumber`.

```http
POST /gps/commands/query
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "serialNumber": "863238077362731",
  "userId": "ccc5cd29-7b46-435e-b517-11bb202c4d1d"
}
```

Comandos logicos soportados:

```text
query
block_engine
unblock_engine
```

Ejemplos:

```http
POST /gps/commands/query
POST /gps/commands/block_engine
POST /gps/commands/unblock_engine
```

## GPS No Reporta

Permite obtener unidades instaladas que dejaron de reportar.

```http
GET /gps/no-reporta?minMinutes=60&page=1&limit=50
Authorization: Bearer <access_token>
```

Respuesta ejemplo:

```json
{
  "generatedAt": "2026-05-05T12:00:00.000Z",
  "total": 2,
  "status": "ready",
  "units": [
    {
      "unitId": 402245387,
      "unitName": "863238077362731",
      "lastMessageAt": "2026-05-05T08:30:00.000Z",
      "minutesWithoutReport": 210
    }
  ]
}
```

Si la bitacora aun se esta generando:

```json
{
  "generatedAt": null,
  "total": 0,
  "status": "processing",
  "units": []
}
```

## Recuperacion

Consulta informacion para recuperacion por VIN/VIM.

```http
GET /recovery/3VW1E2JMXGM123456
Authorization: Bearer <access_token>
```

Uso:

- Si el GPS reporta, devuelve ubicacion actual.
- Si no reporta, devuelve ultima ubicacion conocida y ubicaciones frecuentes.

## Marcar GPS Como Instalado

Este modulo guarda en base de datos el vinculo entre vehiculo, GPS, proveedor y unidad Wialon.

### Crear Instalacion

```http
POST /gps/installations
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "vin": "3VW1E2JMXGM123456",
  "serialNumber": "863238077362731",
  "provider": "Proveedor GPS",
  "installedAt": "2026-05-04T12:00:00.000Z"
}
```

Reglas:

- `vin` se guarda en mayusculas.
- `serialNumber` se valida contra Wialon.
- `provider` es texto libre en v1.
- Si el VIN ya tenia otra instalacion activa, la anterior queda como `replaced`.
- Si se repite el mismo `VIN + serialNumber + provider`, responde `409`.

Respuesta ejemplo:

```json
{
  "id": "4a1ff6d6-5f7d-4b2c-b61d-46f8ab8d22c9",
  "vin": "3VW1E2JMXGM123456",
  "serialNumber": "863238077362731",
  "provider": "Proveedor GPS",
  "status": "active",
  "wialonUnitId": 402245387,
  "wialonUnitName": "863238077362731",
  "installedAt": "2026-05-04T12:00:00.000Z",
  "replacedAt": null
}
```

### Consultar Instalacion Activa Por VIN

```http
GET /gps/installations/3VW1E2JMXGM123456
Authorization: Bearer <access_token>
```

Con proveedor:

```http
GET /gps/installations/3VW1E2JMXGM123456?provider=Proveedor%20GPS
Authorization: Bearer <access_token>
```

### Listar Instalaciones

```http
GET /gps/installations?page=1&limit=50
Authorization: Bearer <access_token>
```

Con filtros:

```http
GET /gps/installations?vin=3VW1E2JMXGM123456&serialNumber=863238077362731&provider=Proveedor%20GPS&status=active&page=1&limit=50
Authorization: Bearer <access_token>
```

Estados:

```text
active
replaced
```

## Agenda De Citas De Instalacion

Flujo recomendado:

1. Crear slot disponible.
2. Agendar cita.
3. Consultar cita.
4. Reagendar o cancelar si aplica.
5. Completar cita con numero de serie GPS.
6. Confirmar que se creo la instalacion.

### Crear Slot Disponible

```http
POST /gps/appointment-slots
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "provider": "Proveedor GPS",
  "startsAt": "2026-05-10T15:00:00.000Z",
  "endsAt": "2026-05-10T16:00:00.000Z",
  "location": "Sucursal CDMX",
  "capacity": 1
}
```

Respuesta ejemplo:

```json
{
  "id": "8f38b48b-79a8-4e61-a82b-7ff1dc899bc2",
  "provider": "Proveedor GPS",
  "startsAt": "2026-05-10T15:00:00.000Z",
  "endsAt": "2026-05-10T16:00:00.000Z",
  "location": "Sucursal CDMX",
  "capacity": 1,
  "reservedCount": 0,
  "isActive": true
}
```

### Listar Slots Disponibles

```http
GET /gps/appointment-slots?provider=Proveedor%20GPS&from=2026-05-01T00:00:00.000Z&to=2026-05-31T23:59:59.999Z&availableOnly=true&page=1&limit=50
Authorization: Bearer <access_token>
```

### Actualizar Slot

```http
PATCH /gps/appointment-slots/8f38b48b-79a8-4e61-a82b-7ff1dc899bc2
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "startsAt": "2026-05-10T16:00:00.000Z",
  "endsAt": "2026-05-10T17:00:00.000Z",
  "location": "Sucursal CDMX",
  "capacity": 2,
  "isActive": true
}
```

### Agendar Cita

```http
POST /gps/appointments
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "vin": "3VW1E2JMXGM123456",
  "provider": "Proveedor GPS",
  "slotId": "8f38b48b-79a8-4e61-a82b-7ff1dc899bc2",
  "customerName": "Juan Perez",
  "customerPhone": "5555555555",
  "customerEmail": "cliente@email.com",
  "notes": "Instalacion en agencia"
}
```

Respuesta ejemplo:

```json
{
  "id": "b7d11798-b9ab-4a3d-9f09-2df83a73a706",
  "vin": "3VW1E2JMXGM123456",
  "provider": "Proveedor GPS",
  "slotId": "8f38b48b-79a8-4e61-a82b-7ff1dc899bc2",
  "status": "scheduled",
  "customerName": "Juan Perez",
  "customerPhone": "5555555555",
  "customerEmail": "cliente@email.com",
  "notes": "Instalacion en agencia"
}
```

### Listar Citas

```http
GET /gps/appointments?vin=3VW1E2JMXGM123456&provider=Proveedor%20GPS&status=scheduled&page=1&limit=50
Authorization: Bearer <access_token>
```

Estados:

```text
scheduled
cancelled
rescheduled
completed
```

### Consultar Cita

```http
GET /gps/appointments/b7d11798-b9ab-4a3d-9f09-2df83a73a706
Authorization: Bearer <access_token>
```

### Reagendar Cita

```http
PATCH /gps/appointments/b7d11798-b9ab-4a3d-9f09-2df83a73a706/reschedule
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "slotId": "nuevo-uuid-slot",
  "notes": "Cliente solicita nuevo horario"
}
```

La API libera cupo del slot anterior y reserva cupo del nuevo.

### Cancelar Cita

```http
PATCH /gps/appointments/b7d11798-b9ab-4a3d-9f09-2df83a73a706/cancel
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "notes": "Cliente cancela"
}
```

La API libera el cupo del slot.

### Completar Cita

```http
PATCH /gps/appointments/b7d11798-b9ab-4a3d-9f09-2df83a73a706/complete
Authorization: Bearer <access_token>
Content-Type: application/json
```

Body:

```json
{
  "serialNumber": "863238077362731",
  "installedAt": "2026-05-10T16:00:00.000Z",
  "notes": "Instalacion completada"
}
```

Al completar:

- Valida que el `serialNumber` exista en Wialon.
- Crea registro en `gps_installations`.
- Marca la cita como `completed`.
- Guarda el `installationId`.

Respuesta ejemplo:

```json
{
  "appointment": {
    "id": "b7d11798-b9ab-4a3d-9f09-2df83a73a706",
    "status": "completed",
    "serialNumber": "863238077362731",
    "installationId": "4a1ff6d6-5f7d-4b2c-b61d-46f8ab8d22c9"
  },
  "installation": {
    "id": "4a1ff6d6-5f7d-4b2c-b61d-46f8ab8d22c9",
    "vin": "3VW1E2JMXGM123456",
    "serialNumber": "863238077362731",
    "provider": "Proveedor GPS",
    "status": "active"
  }
}
```

## Flujo Completo Recomendado Para Cliente

### Flujo 1: Validar Unidad Y Enviar Localizacion

1. `POST /auth/login`
2. `GET /wialon/session/status`
3. `GET /wialon/units?search=863238077362731`
4. `GET /gps/units/{unitId}/commands`
5. `POST /gps/units/{unitId}/commands/exec` con `commandName: "Localizar"`

### Flujo 2: Agendar Y Completar Instalacion

1. `POST /gps/appointment-slots`
2. `GET /gps/appointment-slots?availableOnly=true`
3. `POST /gps/appointments`
4. `GET /gps/appointments/{id}`
5. `PATCH /gps/appointments/{id}/complete`
6. `GET /gps/installations/{vin}`

### Flujo 3: Registrar Instalacion Manual

1. `GET /wialon/units?search=<serialNumber>`
2. `POST /gps/installations`
3. `GET /gps/installations/{vin}`
4. `GET /gps/installations?status=active`

### Flujo 4: Revisar GPS Sin Reporte

1. `GET /gps/no-reporta?minMinutes=60&page=1&limit=50`
2. Identificar unidades sin reporte.
3. `GET /recovery/{vin}`
4. Si aplica, probar `POST /gps/commands/query`.

## Errores Comunes

### 401 Unauthorized

El token no fue enviado, expiro o es invalido.

Solucion:

- Ejecutar nuevamente `POST /auth/login`.
- Actualizar el token en Swagger o Postman.

### 404 UNIT_NOT_FOUND

La unidad no existe en Wialon con el serial enviado.

Solucion:

- Validar con `GET /wialon/units?search=<serialNumber>`.
- Confirmar que el serial corresponde al nombre/identificador usado en Wialon.

### 409 INSTALLATION_ALREADY_ACTIVE

Ya existe una instalacion activa para el mismo `VIN + serialNumber + provider`.

Solucion:

- Consultar `GET /gps/installations/{vin}`.
- Si se trata de reemplazo, enviar otro `serialNumber` o proveedor.

### 409 SLOT_NOT_AVAILABLE

El slot no tiene cupo disponible o esta inactivo.

Solucion:

- Consultar `GET /gps/appointment-slots?availableOnly=true`.
- Usar otro slot.

### WIALON_COMMAND_ERROR

Wialon rechazo el comando.

Solucion:

- Listar comandos con `GET /gps/units/{unitId}/commands`.
- Usar el `commandName` exacto configurado en Wialon.
- Probar primero con `linkType: "tcp"` y `param: ""`.

### WIALON_TIMEOUT

Wialon o la unidad no respondieron en el tiempo esperado.

Solucion:

- Validar conectividad de la unidad.
- Probar comando `Localizar`.
- Confirmar que la unidad esta en linea.

## Orden Sugerido De Pruebas

1. `POST /auth/login`
2. `GET /wialon/session/status`
3. `GET /wialon/units`
4. `GET /gps/units/{unitId}/commands`
5. `POST /gps/appointment-slots`
6. `POST /gps/appointments`
7. `PATCH /gps/appointments/{id}/complete`
8. `GET /gps/installations/{vin}`
9. `GET /gps/no-reporta`
10. `GET /recovery/{vin}`
11. `POST /gps/units/{unitId}/commands/exec`

Probar comandos de motor solo con unidades controladas y autorizadas.
