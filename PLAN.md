# BetoCast - Overlay de Votación para Streamers

Sistema de overlays para streamers que permite a la audiencia votar por carros en competencia mediante mensajes del chat de YouTube.

## Arquitectura

```
YouTube Live Chat
       │
       ▼
┌──────────────────┐
│   Backend        │  Node.js + TypeScript + Express
│   (yt-chat-      │  Puerto 3000
│    signaler)     │
└──────┬───────────┘
       │ WebSocket (Socket.io)
       ▼
┌──────────────────┐     ┌──────────────────┐
│  Admin Panel     │     │  Overlay (OBS)   │
│  /admin          │     │  /overlay/:id    │
│  React + Vite    │     │  HTML + Chart.js │
│  Tailwind + shadcn   │  Transparente     │
└──────────────────┘     └──────────────────┘
       ▲
       │ HTTP GET /sync
       │
┌──────────────┐
│ Stream Deck  │  Botón manual para pull de chat
└──────────────┘
```

## Stack Tecnológico

| Capa | Tecnología | Justificación |
|---|---|---|
| Runtime | Node.js + TypeScript | Ecosistema npm para YouTube libs |
| HTTP Framework | Express | Simple, ampliamente usado |
| YouTube Chat | `yt-chat-signaler` | WebSocket real sin cuota de API |
| Base de datos | SQLite (better-sqlite3) | Sin setup, suficiente para multi-stream |
| Real-time | Socket.io | WebSocket entre backend y frontends |
| Admin UI | React + Vite + TailwindCSS + shadcn/ui | Moderno, bonito, rápido |
| Overlay | HTML + CSS vanilla + Chart.js | Lightweight para OBS Browser Source |
| Gráficas | Chart.js | Barras animadas, doughnut charts |
| Iconos | Lucide React | Consistentes, modernos |

## Reglas de Negocio

### Votos
- Cualquier mensaje del chat que contenga `#` seguido de 1-4 dígitos es un voto válido
- `#123`, `Go #456!`, `el #789 va a ganar` → todos válidos
- Un usuario solo puede votar una vez por stream (UNIQUE constraint en DB)
- Si un usuario intenta votar de nuevo, el voto se ignora silenciosamente
- No hay lista predefinida de carros válidos

### Parsing de votos
```typescript
function parseVote(message: string): string | null {
  const matches = message.match(/#(\d{1,4})/g);
  if (!matches || matches.length !== 1) return null;
  return matches[0].replace('#', '');
}
```

### Stream Deck (Sync manual)
- Endpoint `GET /api/streams/:id/sync` permite pull bajo demanda
- Procesa mensajes desde el último `lastMessageId` procesado
- Conserva votos previos, solo agrega nuevos
- Ideal para Stream Deck con plugin HTTP Request

---

## FASE 1: Backend Core + Mock Data

### Objetivo
Servidor funcional con mock data, sync on-demand, y persistencia en SQLite.

### Archivos a crear

```
betocast/
├── package.json
├── tsconfig.json
├── .env.example
├── .gitignore
├── src/
│   ├── index.ts                      # Entry point, Express + Socket.io setup
│   ├── config.ts                     # Variables de entorno
│   ├── db/
│   │   ├── schema.ts                 # Definición de tablas SQLite
│   │   └── index.ts                  # Conexión y utilidades DB
│   ├── routes/
│   │   ├── streams.ts                # CRUD de streams
│   │   ├── sync.ts                   # Endpoint de sync manual (Stream Deck)
│   │   └── overlay.ts                # Datos para el overlay
│   ├── services/
│   │   ├── vote.service.ts           # Lógica de votación y persistencia
│   │   ├── chat-parser.ts            # Parsing de mensajes (#XXX)
│   │   └── mock-chat.service.ts      # Simulador de chat para desarrollo
│   └── websocket/
│       └── index.ts                  # Socket.io setup y emisión de eventos
```

### Esquema SQLite

```sql
-- Streams/sesiones de encuesta
CREATE TABLE streams (
  id TEXT PRIMARY KEY,
  youtube_url TEXT,
  video_id TEXT,
  title TEXT,
  status TEXT DEFAULT 'active' CHECK(status IN ('active', 'paused', 'closed')),
  max_pilots_display INTEGER DEFAULT 10,
  last_message_id TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Pilotos/carros registrados (para nombre/color en overlay)
CREATE TABLE pilots (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  car_number TEXT NOT NULL,
  driver_name TEXT,
  color TEXT DEFAULT '#3b82f6',
  UNIQUE(stream_id, car_number)
);

-- Votos
CREATE TABLE votes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL,
  user_name TEXT,
  car_number TEXT NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(stream_id, user_id)
);

-- Log de mensajes del chat
CREATE TABLE chat_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  stream_id TEXT NOT NULL REFERENCES streams(id) ON DELETE CASCADE,
  youtube_message_id TEXT UNIQUE,
  user_id TEXT,
  user_name TEXT,
  message TEXT,
  is_vote INTEGER DEFAULT 0,
  car_number TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

### API Endpoints

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/streams` | Crear stream |
| GET | `/api/streams` | Listar streams |
| GET | `/api/streams/:id` | Detalle stream |
| PUT | `/api/streams/:id` | Actualizar stream (max_pilots_display, status) |
| DELETE | `/api/streams/:id` | Eliminar stream |
| POST | `/api/streams/:id/pilots` | Agregar piloto |
| DELETE | `/api/streams/:id/pilots/:carNumber` | Eliminar piloto |
| GET | `/api/streams/:id/pilots` | Listar pilotos |
| GET | `/api/streams/:id/votes` | Resultados de votación |
| **GET** | **`/api/streams/:id/sync`** | **Pull manual de chat (Stream Deck)** |
| POST | `/api/streams/:id/mock/start` | Iniciar simulación mock |
| POST | `/api/streams/:id/mock/stop` | Detener simulación mock |
| GET | `/overlay/:id` | Página del overlay |
| GET | `/admin` | Página del panel admin |

### Mock Chat Service

Simula mensajes del chat cada 1-3 segundos:
- Usuarios aleatorios (nombres generados)
- Votos aleatorios hacia carros predefinidos
- Mensajes normales sin voto (~30%)
- Velocidad configurable
- Incluye votos duplicados (mismo usuario intenta votar 2 veces)

### Criterio de validación Fase 1
- [ ] `npm run dev` levanta el servidor en puerto 3000
- [ ] Se puede crear un stream vía POST
- [ ] Mock chat simula votos y se insertan en DB
- [ ] GET `/api/streams/:id/votes` retorna conteo actualizado
- [ ] Un usuario solo puede votar una vez (DB UNIQUE constraint)
- [ ] GET `/api/streams/:id/sync` procesa mensajes nuevos on-demand
- [ ] Después de sync, votos previos se conservan
- [ ] Socket.io emite eventos cuando hay nuevos votos

---

## FASE 2: Panel de Administración

### Objetivo
Admin puede crear streams, configurar pilotos, ver resultados en tiempo real, y controlar la encuesta.

### Stack Frontend
- React 18 + TypeScript
- Vite (bundler)
- TailwindCSS (styling)
- shadcn/ui (componentes)
- Chart.js + react-chartjs-2 (gráficas)
- Socket.io client (real-time)
- Lucide React (iconos)

### Archivos a crear

```
admin/
├── package.json
├── vite.config.ts
├── tailwind.config.js
├── postcss.config.js
├── index.html
├── components.json                    # shadcn/ui config
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── lib/
│   │   └── utils.ts                   # cn() utility
│   ├── api/
│   │   └── index.ts                   # Fetch wrapper
│   ├── hooks/
│   │   ├── useSocket.ts              # Socket.io hook
│   │   └── useStream.ts             # API calls
│   ├── types/
│   │   └── index.ts                   # TypeScript interfaces
│   ├── pages/
│   │   ├── Dashboard.tsx             # Lista de streams
│   │   ├── StreamSetup.tsx           # Crear/editar stream
│   │   └── StreamLive.tsx            # Vista en vivo con resultados
│   └── components/
│       ├── ui/                        # shadcn/ui components
│       │   ├── button.tsx
│       │   ├── card.tsx
│       │   ├── input.tsx
│       │   ├── badge.tsx
│       │   └── dialog.tsx
│       ├── StreamCard.tsx            # Card de stream en dashboard
│       ├── PilotManager.tsx          # Agregar/quitar pilotos
│       ├── VoteBarChart.tsx          # Gráfica de barras horizontal
│       ├── VoteDoughnut.tsx          # Gráfica doughnut (opcional)
│       ├── LiveChatPreview.tsx       # Preview del chat en tiempo real
│       ├── OverlayLink.tsx           # Link copiable para OBS
│       └── SyncButton.tsx            # Botón de sync manual
```

### Pantallas

#### Dashboard (`/admin`)
- Header con logo BetoCast
- Grid de cards con cada stream activo
- Cada card muestra: título, status badge, total votos, link al overlay
- Botón "Crear nuevo stream"
- Botón "Sync" en cada card

#### Stream Setup (`/admin/stream/new`)
- Input: URL de YouTube (o ID del video)
- Input: Título descriptivo
- Sección de pilotos: formulario para agregar nombre + número + color
- Selector: máximo pilotos a mostrar en overlay (1-20)
- Botón "Iniciar con Mock" (desarrollo)
- Botón "Conectar a YouTube" (producción)

#### Stream Live (`/admin/stream/:id`)
- Header con título del stream y status
- **Gráfica de barras horizontal** con votos por piloto (Chart.js)
  - Cada barra con color del piloto
  - Animación suave al actualizar
  - Mostrar conteo de votos en cada barra
- **Panel lateral derecho:**
  - Preview del chat en tiempo real
  - Total de participantes únicos
  - Total de votos
- **Controles:**
  - Botón Sync (pull manual)
  - Botón Pausar/Reanudar votación
  - Botón Cerrar stream
  - Input para cambiar max_pilots_display en vivo
  - Link copiable al overlay

### Criterio de validación Fase 2
- [ ] Admin puede crear stream con URL mock
- [ ] Se pueden agregar/eliminar pilotos con nombre y color
- [ ] Mock chat genera votos que aparecen en el admin
- [ ] Gráfica de barras muestra resultados actualizados en tiempo real
- [ ] Se puede cambiar max_pilots_display y el overlay lo refleja
- [ ] Botón Sync funciona y muestra feedback
- [ ] Link al overlay se puede copiar al clipboard
- [ ] UI responsive y visualmente atractiva

---

## FASE 3: Overlay para OBS

### Objetivo
Overlay transparente que muestra los resultados de votación en tiempo real, optimizado para OBS Browser Source.

### Archivos a crear

```
overlay/
├── index.html                        # Template base
├── src/
│   ├── main.ts
│   ├── styles.css                    # Animaciones, glassmorphism, theme
│   ├── socket.ts                     # Conexión Socket.io al backend
│   ├── components/
│   │   ├── Header.tsx                # Título del stream
│   │   ├── BarChart.tsx              # Barras animadas de votos
│   │   ├── PilotCard.tsx             # Info del piloto en la barra
│   │   └── Footer.tsx                # Total votos + participantes
│   └── utils/
│       └── colors.ts                 # Utilidades de color
```

### Diseño Visual

```
┌─────────────────────────────────────────────────────────┐
│  🏁 BetoCast - Carrera #1                              │
│                                                         │
│  #123  Juan Pérez                                       │
│  ████████████████████████████████░░░░░░░░  45 votos     │
│                                                         │
│  #456  María García                                     │
│  ██████████████████████░░░░░░░░░░░░░░░░░░  32 votos     │
│                                                         │
│  #789  Carlos López                                     │
│  ██████████████████░░░░░░░░░░░░░░░░░░░░░░  28 votos     │
│                                                         │
│  #012  Ana Martínez                                     │
│  ████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░  18 votos     │
│                                                         │
│  #345  Pedro Sánchez                                    │
│  ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  12 votos     │
│                                                         │
│  ─────────────────────────────────────────────────────  │
│  135 votos  │  23 participantes  │  Sync: 12s atrás    │
└─────────────────────────────────────────────────────────┘
```

### Características visuales
- **Fondo**: Totalmente transparente (para superponer en OBS)
- **Estilo**: Glassmorphism sutil, bordes redondeados
- **Barras**: Gradiente con color del piloto, animación CSS transition
- **Posiciones**: Se reordenan suavemente cuando cambia el ranking (FLIP animation)
- **Top N**: Solo muestra los N pilotos con más votos (configurable)
- **Sin piloto registrado**: Muestra solo `#XXX` sin nombre
- **Responsive**: Se adapta al tamaño del Browser Source en OBS
- **Font**: Inter o similar (moderno, legible)

### Animaciones
- Barras: `transition: width 0.6s cubic-bezier(0.4, 0, 0.2, 1)`
- Reordenamiento: Animación de posición con transform
- Nuevo voto: Flash sutil en la barra afectada
- Contador de votos: Conteo animado (count up)

### Configuración vía URL params
```
/overlay/:id?theme=dark&barHeight=40&showNames=true&showTotal=true
```

### Criterio de validación Fase 3
- [ ] Overlay carga en Browser Source de OBS (fondo transparente)
- [ ] Barras se animan al recibir nuevos votos
- [ ] Solo muestra Top N pilotos (respeta max_pilots_display)
- [ ] Posiciones se actualizan cuando cambia el ranking
- [ ] No hay flicker ni lag en OBS
- [ ] Sin piloto registrado se muestra solo el número
- [ ] Funciona con cualquier resolución de Browser Source

---

## FASE 4: Conexión Real con YouTube

### Objetivo
Conectar streams reales de YouTube usando `yt-chat-signaler` en lugar del mock.

### Archivos a crear/modificar

```
src/services/
├── youtube-chat.service.ts           # Integración yt-chat-signaler
```

### Integración

```typescript
import { YtChatSignaler } from 'yt-chat-signaler';

// Por cada stream activo, crear conexión
const clients = new Map<string, YtChatSignaler>();

function connectToStream(streamId: string, videoId: string) {
  const client = new YtChatSignaler({ chats: [videoId] });

  client.on('data', ({ data }) => {
    // Parsear mensaje del chat
    // Si contiene #XXX → registrar voto via vote.service
    // Emitir vía Socket.io al overlay
  });

  client.on('connectionError', (error) => {
    console.error(`Error en stream ${streamId}:`, error);
    // Reconexión automática configurada en yt-chat-signaler
  });

  client.start();
  clients.set(streamId, client);
}

function disconnectStream(streamId: string) {
  const client = clients.get(streamId);
  if (client) {
    client.stop(streamId);
    clients.delete(streamId);
  }
}
```

### Endpoints adicionales

| Método | Ruta | Descripción |
|---|---|---|
| POST | `/api/streams/:id/connect` | Conectar a YouTube real |
| POST | `/api/streams/:id/disconnect` | Desconectar de YouTube |

### Criterio de validación Fase 4
- [ ] Se puede conectar a un stream de YouTube real
- [ ] Los mensajes del chat se reciben en el backend
- [ ] Los votos `#XXX` se procesan correctamente
- [ ] El overlay muestra votos del stream real
- [ ] La reconexión automática funciona si se pierde conexión
- [ ] Múltiples streams pueden correr simultáneamente
- [ ] Desconexión limpia libera recursos

---

## FASE 5: README + Pulido

### Archivos

```
betocast/
├── README.md                          # Documentación completa
├── LICENSE                            # MIT
├── docker-compose.yml                 # Opcional: levantar todo
├── Makefile                           # Comandos útiles
└── examples/
    └── mock-stream.json               # Ejemplo de config
```

### README debe incluir
- Descripción del proyecto con screenshots
- Requisitos previos (Node.js 18+)
- Instrucciones de instalación paso a paso
- Cómo configurar un stream mock
- Cómo conectar a YouTube real
- Cómo agregar el overlay en OBS (Browser Source)
- API documentation
- Configuración del Stream Deck
- Troubleshooting

### Criterio de validación Fase 5
- [ ] README claro con screenshots
- [ ] Instrucciones de instalación funcionan desde cero
- [ ] Ejemplo de mock stream funciona
- [ ] Licencia MIT incluida
- [ ] .gitignore completo

---

## Resumen de Fases

| Fase | Descripción | Tiempo estimado | Dependencias |
|---|---|---|---|
| **1** | Backend Core + Mock Data + SQLite | 3-4 días | Ninguna |
| **2** | Panel Admin UI (React) | 4-5 días | Fase 1 |
| **3** | Overlay para OBS | 3-4 días | Fase 1 |
| **4** | Conexión YouTube real | 2-3 días | Fase 1 |
| **5** | README + Pulido | 1-2 días | Fases 1-4 |
| **Total** | | **13-18 días** | |

**Fases paralelas**: La Fase 2 y Fase 3 pueden desarrollarse en paralelo ya que ambas dependen solo del backend (Fase 1).

---

## Decisiones Pendientes

1. **Puerto del backend**: ¿3000 o configurable vía env?
2. **¿Admin y Overlay en el mismo server?** Sí, Express sirve ambos
3. **¿Multi-tenant?** No, un solo admin controla todos los streams
4. **¿Autenticación del admin?** No por ahora (acceso local)
5. **¿Deploy?** Local por ahora, Docker opcional en Fase 5
