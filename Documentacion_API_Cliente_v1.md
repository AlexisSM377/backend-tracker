# Requerimiento de API — Integración de Rastreo y Telemetría GPS

## Introducción

El presente documento detalla la interfaz de programación de aplicaciones (API) desarrollada para la gestión, monitoreo y control de unidades GPS.

**URL Base:** `https://kavakv1.trackergps.cloud`

**Documentación Swagger:** `https://kavakv1.trackergps.cloud/api/docs`

**Autenticación:** Todos los endpoints requieren un token de tipo `Bearer` en el header `Authorization`.

---

## Módulo 2: Comandos Remotos en Tiempo Real

### `POST /gps/commands/{cmd}`

Envía una instrucción en tiempo real a un dispositivo GPS específico utilizando su número de serie o IMEI. El sistema localiza la unidad, gestiona la comunicación bidireccional y guarda un log de auditoría automáticamente.

### Parámetros de Ruta (URL)

| Parámetro | Tipo     | Descripción |
| :-------- | :------- | :---------- |
| `cmd`     | `string` | Tipo de comando a ejecutar. Valores permitidos: `query` (forzar reporte de posición), `block_engine` (apagado de motor), `unblock_engine` (encendido de motor). |

### Parámetros de Cuerpo (JSON Body)

| Parámetro      | Tipo     | Requerido | Descripción |
| :------------- | :------- | :-------- | :---------- |
| `serialNumber` | `string` | Sí        | Número de serie o IMEI del dispositivo GPS. |
| `userId`       | `string` | Sí        | Identificador del usuario que ejecuta la acción (utilizado para registro de auditoría). |

### Ejemplo de Petición (cURL)

```bash
curl -X POST "https://kavakv1.trackergps.cloud/gps/commands/block_engine" \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer TU_TOKEN_AQUI" \
     -d '{
           "serialNumber": "869412040001234",
           "userId": "USR-98765"
         }'
```

### Respuesta Exitosa — `200 OK`

```json
{
  "success": true,
  "cmd": "block_engine",
  "serialNumber": "869412040001234",
  "wialonUnitId": 45821,
  "unitName": "Unidad-047 / VW Jetta",
  "executedAt": "2026-04-06T21:05:00Z",
  "executedBy": "USR-98765",
  "wialonResponse": {
    "status": "ok",
    "commandSent": true
  }
}
```

### Respuesta de Error — `404 Not Found`

```json
{
  "success": false,
  "error": "UNIT_NOT_FOUND",
  "message": "No se encontró ninguna unidad con el número de serie 869412040001234 en la plataforma."
}
```

### Respuesta de Error — `502 Bad Gateway`

```json
{
  "success": false,
  "error": "WIALON_TIMEOUT",
  "message": "El dispositivo no respondió al comando dentro del tiempo de espera. Intente nuevamente."
}
```

---

## Módulo 3: Bitácora "No Reporta"

Este módulo es un proceso automatizado (Cron Job) que se ejecuta diariamente en segundo plano. **No requiere ser invocado por el cliente.**

### Descripción del Proceso

El sistema escanea diariamente el estado de toda la flotilla de unidades. Identifica el último mensaje recibido de cada GPS, calcula el tiempo que lleva sin reportar e inserta el resultado en la base de datos para su consulta posterior.

### Endpoint de Consulta

#### `GET /gps/no-reporta`

Permite al cliente consultar el listado más reciente de unidades sin reporte.

### Parámetros de Query (Opcionales)

| Parámetro       | Tipo      | Descripción |
| :-------------- | :-------- | :---------- |
| `minMinutes`    | `integer` | Filtrar unidades con más de N minutos sin reportar. Ejemplo: `?minMinutes=60` |
| `page`          | `integer` | Número de página para paginación. |
| `limit`         | `integer` | Cantidad de resultados por página (default: 50). |

### Ejemplo de Petición (cURL)

```bash
curl -X GET "https://kavakv1.trackergps.cloud/gps/no-reporta?minMinutes=120" \
     -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Respuesta Exitosa — `200 OK`

```json
{
  "generatedAt": "2026-04-06T07:00:00Z",
  "total": 3,
  "units": [
    {
      "wialonUnitId": 45821,
      "unitName": "Unidad-047 / VW Jetta",
      "serialNumber": "869412040001234",
      "lastReportAt": "2026-04-05T14:32:10Z",
      "minutesWithoutReport": 990,
      "lastKnownLocation": {
        "lat": 19.432608,
        "lon": -99.133209,
        "speed": 0
      }
    },
    {
      "wialonUnitId": 47103,
      "unitName": "Unidad-012 / Nissan Versa",
      "serialNumber": "869412040005678",
      "lastReportAt": "2026-04-05T18:10:00Z",
      "minutesWithoutReport": 650,
      "lastKnownLocation": {
        "lat": 20.659698,
        "lon": -103.349609,
        "speed": 0
      }
    },
    {
      "wialonUnitId": 48890,
      "unitName": "Unidad-089 / Chevrolet Aveo",
      "serialNumber": "869412040009999",
      "lastReportAt": "2026-04-04T22:00:00Z",
      "minutesWithoutReport": 1740,
      "lastKnownLocation": {
        "lat": 25.686614,
        "lon": -100.316113,
        "speed": 0
      }
    }
  ]
}
```

---

## Módulo 4: Bitácora de Recuperación

### `GET /recovery/{vim}`

Consulta la ubicación de un vehículo para asistir en su recuperación. El sistema determina automáticamente si el GPS está activo o no, devolviendo la respuesta más útil en cada caso.

### Parámetros de Ruta (URL)

| Parámetro | Tipo     | Descripción |
| :-------- | :------- | :---------- |
| `vim`     | `string` | Número de Identificación Vehicular (VIN/VIM) asociado al vehículo. |

### Ejemplo de Petición (cURL)

```bash
curl -X GET "https://kavakv1.trackergps.cloud/recovery/3VW1E2JMXGM123456" \
     -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Respuesta Exitosa — `200 OK` (GPS Reportando — Tiempo Real)

Cuando el GPS se encuentra activo y reportando, se devuelve la posición exacta del vehículo en ese momento.

```json
{
  "vim": "3VW1E2JMXGM123456",
  "unitName": "Unidad-047 / VW Jetta",
  "status": "online",
  "location": {
    "lat": 19.432608,
    "lon": -99.133209,
    "speed": 42,
    "heading": 270,
    "reportedAt": "2026-04-06T21:04:55Z"
  }
}
```

### Respuesta Exitosa — `200 OK` (GPS Sin Reportar — Historial)

Cuando el GPS dejó de reportar, se devuelve la lista de sus últimas ubicaciones conocidas ordenadas por frecuencia de visita, útil para identificar patrones de dónde puede encontrarse el vehículo.

```json
{
  "vim": "3VW1E2JMXGM123456",
  "unitName": "Unidad-047 / VW Jetta",
  "status": "offline",
  "lastReportAt": "2026-04-05T14:32:10Z",
  "minutesWithoutReport": 990,
  "frequentLocations": [
    {
      "rank": 1,
      "lat": 19.432608,
      "lon": -99.133209,
      "visitCount": 48,
      "label": "Ubicación más frecuente"
    },
    {
      "rank": 2,
      "lat": 19.451800,
      "lon": -99.150200,
      "visitCount": 21,
      "label": "Segunda ubicación más frecuente"
    },
    {
      "rank": 3,
      "lat": 19.460100,
      "lon": -99.120400,
      "visitCount": 9,
      "label": "Tercera ubicación más frecuente"
    }
  ]
}
```

### Respuesta de Error — `404 Not Found`

```json
{
  "success": false,
  "error": "VEHICLE_NOT_FOUND",
  "message": "No se encontró ningún vehículo con el VIM 3VW1E2JMXGM123456 en la plataforma."
}
```
