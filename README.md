# Tracker Core

API backend en NestJS para integrar operaciones GPS con Wialon: autenticacion, sesiones Wialon, consulta de unidades, bitacoras de no reporte, recuperacion, comandos remotos e instalaciones GPS.

## Stack

- NestJS 11
- TypeScript
- PostgreSQL
- TypeORM
- JWT
- Wialon API
- pnpm / npm scripts

## Requisitos

- Node.js compatible con NestJS 11
- PostgreSQL en ejecucion
- Token valido de Wialon
- Base de datos creada previamente

## Configuracion

Crear un archivo `.env` en la raiz del proyecto:

```env
PORT=3000
DATABASE_URL=postgres://usuario:password@localhost:5432/tracker_core
JWT_SECRET=change_me

WIALON_API_URL=https://hst-api.wialon.com/wialon/ajax.html
WIALON_TOKEN=token_de_wialon

# Opcional: usuario interno usado para generar snapshots diarios de no-reporta
WIALON_SYSTEM_USER_ID=uuid_del_usuario

# Opcionales
WIALON_REQUEST_TIMEOUT_MS=30000
WIALON_COMMAND_TIMEOUT_SECONDS=60
```

> Nota: el proyecto usa `synchronize: true` en TypeORM. Esto facilita desarrollo porque crea/ajusta tablas automaticamente, pero no es recomendable para produccion sin migraciones controladas.

## Instalacion

```bash
pnpm install
```

Tambien se pueden ejecutar los scripts con `npm.cmd` en Windows si ya estan instaladas las dependencias.

## Ejecutar

```bash
npm run start:dev
```

La API queda disponible por defecto en:

```text
http://localhost:3000
```

## Scripts

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

## Autenticacion

La mayoria de endpoints operativos requieren JWT:

```http
Authorization: Bearer <access_token>
```

El interceptor de Wialon obtiene o renueva automaticamente el SID usando el usuario autenticado y el `WIALON_TOKEN`.

## Flujo Basico

1. Registrar usuario.
2. Iniciar sesion para obtener JWT.
3. Usar el JWT en endpoints protegidos.
4. Ejecutar consultas o acciones GPS.

## Endpoints

### Usuarios

#### Registrar usuario

```http
POST /users/register
```

Body:

```json
{
  "username": "admin",
  "password": "password_seguro"
}
```

### Auth

#### Login

```http
POST /auth/login
```

Body:

```json
{
  "username": "admin",
  "password": "password_seguro"
}
```

Usar el token retornado como `Bearer Token` en Postman.

### Wialon

Todos requieren JWT.

#### Listar unidades

```http
GET /wialon/units?page=1&pageSize=50&search=863238077362731
```

#### Listar retransmisores

```http
GET /wialon/retranslators
```

#### Buscar retransmisor por nombre

```http
GET /wialon/retranslators/:name
```

#### Ver estado de sesion Wialon

```http
GET /wialon/session/status
```

#### Renovar SID manualmente

```http
POST /wialon/session/refresh
```

### GPS: Comandos

Todos requieren JWT y sesion Wialon.

#### Ejecutar comando normalizado por numero de serie

```http
POST /gps/commands/:cmd
```

Comandos soportados:

- `query`
- `block_engine`
- `unblock_engine`

Body:

```json
{
  "serialNumber": "863238077362731",
  "userId": "uuid_del_usuario"
}
```

El servicio resuelve la unidad en Wialon por `serialNumber`, detecta el comando configurado en la unidad y ejecuta `unit/exec_cmd`.

#### Listar comandos de una unidad Wialon

```http
GET /gps/units/:unitId/commands
```

Ejemplo:

```http
GET /gps/units/402245387/commands
```

Devuelve comandos configurados y comandos disponibles en ese momento.

#### Ejecutar comando directo por unidad Wialon

```http
POST /gps/units/:unitId/commands/exec
```

Body:

```json
{
  "commandName": "Localizar",
  "linkType": "tcp",
  "param": "",
  "userId": "uuid_del_usuario"
}
```

Usar este endpoint cuando se quiere probar el nombre exacto del comando configurado en Wialon.

### GPS: No Reporta

#### Obtener unidades que no reportan

```http
GET /gps/no-reporta?minMinutes=60&page=1&limit=50
```

Respuesta esperada:

```json
{
  "generatedAt": "2026-05-04T12:00:00.000Z",
  "total": 10,
  "status": "ready",
  "units": []
}
```

Si aun no existe snapshot, el endpoint responde `processing` e inicia la generacion en segundo plano.

### GPS: Recuperacion

#### Consultar recuperacion por VIN/VIM

```http
GET /recovery/:vim
```

Si la unidad esta reportando, devuelve ubicacion actual. Si no reporta, devuelve ultima fecha de reporte y ubicaciones frecuentes calculadas con historial de Wialon.

### GPS: Instalaciones

Modulo para marcar GPS como instalado en un vehiculo. Guarda el vinculo entre VIN, numero de serie GPS, proveedor y unidad Wialon.

#### Crear instalacion

```http
POST /gps/installations
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

- `vin` se normaliza con `trim + uppercase`.
- `serialNumber` y `provider` se normalizan con `trim`.
- `installedAt` es opcional; si no se envia, se usa la fecha actual.
- Valida obligatoriamente que el `serialNumber` exista en Wialon.
- Solo puede existir una instalacion `active` por VIN.
- Si el VIN ya tiene otra instalacion activa, la anterior pasa a `replaced`.
- Si se repite el mismo `VIN + serialNumber + provider` activo, responde `409 INSTALLATION_ALREADY_ACTIVE`.

#### Obtener instalacion activa por VIN

```http
GET /gps/installations/:vin
```

Con filtro opcional por proveedor:

```http
GET /gps/installations/3VW1E2JMXGM123456?provider=Proveedor%20GPS
```

#### Listar instalaciones

```http
GET /gps/installations?page=1&limit=50
```

Filtros opcionales:

```http
GET /gps/installations?vin=3VW1E2JMXGM123456&serialNumber=863238077362731&provider=Proveedor%20GPS&status=active&page=1&limit=50
```

Estados:

- `active`
- `replaced`

## Tablas Principales

- `user`: usuarios, password hash y sesion Wialon asociada.
- `gps_command_audits`: auditoria de comandos enviados a Wialon.
- `no_report_snapshots`: snapshots de unidades sin reporte.
- `gps_installations`: instalaciones GPS por VIN.

## Errores Frecuentes

### `WIALON_TIMEOUT`

La API de Wialon o la unidad no respondio dentro del tiempo configurado. Revisar conectividad, estado de la unidad y `WIALON_REQUEST_TIMEOUT_MS`.

### `VALIDATE_PARAMS_ERROR`

Wialon rechazo los parametros de `unit/exec_cmd`. Confirmar que se esta enviando `commandName`, `linkType`, `param`, `timeout` y `itemId` con los tipos correctos. Los comandos deben enviarse por `POST`.

### `COMMAND_NOT_AVAILABLE`

La unidad no tiene configurado un comando compatible o no se pudo resolver por alias. Usar:

```http
GET /gps/units/:unitId/commands
```

para ver los comandos disponibles y despues probar con:

```http
POST /gps/units/:unitId/commands/exec
```

### `UNIT_NOT_FOUND`

No se encontro la unidad en Wialon por el identificador usado. Validar numero de serie, VIN/VIM o `unitId`.

## Pruebas Manuales Recomendadas

1. `POST /auth/login`
2. `GET /wialon/session/status`
3. `GET /wialon/units?search=<serial>`
4. `GET /gps/units/<unitId>/commands`
5. `POST /gps/units/<unitId>/commands/exec`
6. `POST /gps/commands/query`
7. `POST /gps/installations`
8. `GET /gps/installations/<vin>`
9. `GET /gps/no-reporta?minMinutes=60&page=1&limit=50`

## Estado Funcional

Cubierto actualmente:

- Login JWT.
- Gestion basica de usuarios.
- Sesion Wialon con renovacion.
- Consulta de unidades Wialon.
- Ejecucion de comandos GPS.
- Auditoria de comandos.
- Bitacora de no reporte por snapshot.
- Recuperacion con ubicacion actual o ubicaciones frecuentes.
- Registro manual de instalaciones GPS.

Pendiente si el proveedor lo requiere:

- Webhook/API para recibir instalaciones automaticamente.
- Carga por archivo de instalaciones.
- Catalogo formal de proveedores.
- Agenda de citas de instalacion.
- Migraciones TypeORM para produccion.
