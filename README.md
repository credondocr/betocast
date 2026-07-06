# BetoCast

Overlay de votación en tiempo real para streamers. Permite a la audiencia votar por carros en competencia mediante mensajes del chat de YouTube.

## Features

- Votación en tiempo real desde el chat de YouTube
- Overlay transparente para OBS con barras animadas
- Panel de administración moderno
- Soporte para múltiples streams simultáneos
- Mock data para desarrollo sin YouTube
- Sync manual para Stream Deck
- Configuración vía URL params en el overlay

## Quick Start

### Requisitos

- Node.js 18+
- npm

### Instalación

```bash
git clone https://github.com/credondocr/betocast.git
cd betocast
make install
```

### Configuración

Crear archivo `.env` en la raíz:

```bash
PORT=3001
DB_PATH=./data/betocast.db
YOUTUBE_API_KEY=tu_api_key_aquí
```

> La `YOUTUBE_API_KEY` es opcional para desarrollo con mock. Es requerida para conectar streams reales de YouTube.

### Ejecutar

```bash
make dev
```

Esto levanta:
- **Backend**: http://localhost:3001
- **Admin**: http://localhost:5173

## YouTube API Key

Para conectar streams reales de YouTube:

1. Ir a [Google Cloud Console](https://console.cloud.google.com)
2. Crear un proyecto o seleccionar uno existente
3. Habilitar **YouTube Data API v3**
4. Ir a **Credenciales** → Crear **API Key**
5. Copiar la key al archivo `.env`

> Con la tier gratuita obtienes 10,000 unidades/día. Cada sync consume ~200-500 unidades.

## Uso

### Crear un stream

1. Abrir http://localhost:5173
2. Click **"Nuevo Stream"**
3. Pegar la URL del stream de YouTube
4. Agregar pilotos (número + nombre + color)
5. Click **"Crear stream"**

### Iniciar la votación

1. En la vista del stream, click **"Iniciar Mock"** (desarrollo) o **"Sync"** (YouTube real)
2. El gráfico de votación se actualiza en tiempo real
3. Click **"Abrir Overlay"** para previsualizar

### Agregar en OBS

1. En OBS, agregar **Browser Source**
2. URL: `http://localhost:3001/overlay/TU_STREAM_ID`
3. Width: 500, Height: 400 (ajustar según necesidad)
4. Marcar **"Control de CSS personalizado"** y agregar:
   ```css
   body { background: transparent; }
   ```

### URL params del overlay

```
/overlay/:id?barHeight=48&fontSize=16&showNames=true&showHeader=false&showTotal=true&opacity=0.9&max=5
```

| Param | Default | Descripción |
|---|---|---|
| `barHeight` | 38 | Altura de cada barra en px |
| `fontSize` | 14 | Tamaño del número de carro |
| `showNames` | true | Mostrar nombre del piloto |
| `showTotal` | true | Mostrar footer con totales |
| `showHeader` | true | Mostrar título del stream |
| `max` | stream config | Máximo de pilotos a mostrar |
| `opacity` | 1 | Opacidad del overlay |

## Stream Deck Setup

Para sincronizar el chat de YouTube con un botón del Stream Deck:

### Opción 1: Plugin HTTP Request

1. Instalar plugin **"HTTP Request"** del Elgato Marketplace
2. Crear botón con acción **HTTP GET**
3. URL: `http://localhost:3001/api/streams/TU_STREAM_ID/sync`
4. Method: `GET`

### Opción 2: cURL desde terminal

```bash
curl http://localhost:3001/api/streams/TU_STREAM_ID/sync
```

### Feedback

El endpoint retorna JSON con el resultado del sync:

```json
{
  "success": true,
  "message": "Procesados 15 mensajes, 3 votos nuevos",
  "newVotes": 3,
  "total": { "totalVotes": 42, "totalVoters": 38 }
}
```

## API Reference

### Streams

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/streams` | Listar streams |
| GET | `/api/streams/:id` | Detalle de stream |
| POST | `/api/streams` | Crear stream |
| PUT | `/api/streams/:id` | Actualizar stream |
| DELETE | `/api/streams/:id` | Eliminar stream |

### Pilotos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/streams/:id/pilots` | Listar pilotos |
| POST | `/api/streams/:id/pilots` | Agregar piloto |
| DELETE | `/api/streams/:id/pilots/:carNumber` | Eliminar piloto |

### Votos

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/streams/:id/votes` | Obtener resultados |

### Sync

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/api/streams/:id/sync` | Pull manual de chat |

### Mock

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/streams/:id/mock/start` | Iniciar simulación |
| POST | `/api/streams/:id/mock/stop` | Detener simulación |

### Overlay

| Método | Ruta | Descripción |
|---|---|---|
| GET | `/overlay/:id` | Overlay HTML para OBS |

## Reglas de Votación

- Cualquier mensaje que contenga `#` seguido de 1-4 dígitos es un voto válido
- Ejemplos válidos: `#123`, `¡Vamos #456!`, `#789 va a ganar`
- Un usuario solo puede votar una vez por stream
- Si un usuario intenta votar de nuevo, el voto se ignora silenciosamente

## Project Structure

```
betocast/
├── src/                    # Backend (Node.js + Express + TypeScript)
│   ├── index.ts            # Entry point
│   ├── config.ts           # Variables de entorno
│   ├── db/                 # SQLite (sql.js)
│   ├── services/           # Lógica de negocio
│   │   ├── vote.service.ts
│   │   ├── chat-parser.ts
│   │   ├── mock-chat.service.ts
│   │   └── youtube-chat.service.ts
│   ├── routes/             # API REST
│   │   ├── streams.ts
│   │   ├── sync.ts
│   │   └── overlay.ts
│   └── websocket/          # Socket.io
├── admin/                  # Frontend (React + Vite + TailwindCSS)
│   └── src/
│       ├── pages/          # Dashboard, StreamSetup, StreamLive
│       ├── components/     # VoteBarChart, ChatPreview, PilotManager
│       ├── hooks/          # useSocket
│       └── lib/            # API client, utils
├── PLAN.md                 # Plan de desarrollo
├── Makefile                # Comandos de desarrollo
└── .env.example            # Template de configuración
```

## Tech Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + TypeScript + Express |
| YouTube Chat | YouTube Data API v3 |
| Base de datos | SQLite (sql.js) |
| Real-time | Socket.io |
| Admin UI | React + Vite + TailwindCSS |
| Overlay | HTML + CSS vanilla + Socket.io |
| Gráficas | Chart.js + react-chartjs-2 |

## Development

```bash
# Instalar dependencias
make install

# Ejecutar en desarrollo
make dev

# Detener servidores
make stop

# Limpiar DB
make clean
```

## License

MIT
