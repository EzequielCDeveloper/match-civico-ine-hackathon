# Match Cívico — Monorepo Hackathon INE 2024 (Go + React Native)

Arquitectura modular desacoplada (**Package by Feature**) para desarrollo en paralelo de 3 desarrolladores simultáneos con soporte unificado para **Móvil (Android/iOS)** y **Web**.

---

## 👥 Asignación de Módulos y Roles

| Desarrollador | Módulo | Responsabilidades Funcionales | Backend (`internal/`) | Frontend (`src/features/`) | Tabla Prefijada SQLite | Rama Git |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Luis** | `candidatos` | Filtrado de candidatos, presentación de candidaturas, visualización de propuestas y grados académicos. | `internal/candidatos/` | `src/features/candidatos/` | `candidatos_candidatos` | `feature/candidatos-luis` |
| **Ezequiel** | `votantes` | Perfil de usuario votante, cálculo de porcentaje demográfico (joven vs general), análisis de abstencionismo INE 2024. | `internal/votantes/` | `src/features/votantes/` | `votantes_entidades`<br>`votantes_distritos`<br>`votantes_perfiles` | `feature/votantes-ezequiel` |
| **Juan** | `sistema` | Reset de información de la app, exportación de reportes a PDF, auditoría de base de datos y resolución de conflictos de fusión. | `internal/sistema/` | `src/features/sistema/` | `sistema_resets`<br>`sistema_exportaciones` | `feature/sistema-juan` |
| **Aleksey** | *QA & Security* | Auditoría UI/UX, testing de integración, validación de endpoints y pentesting. | Global / Tests | Global / Tests | — | `qa/audit-aleksey` |

---

## 🏛️ Estructura del Monorepo

```text
/
├── backend/
│   ├── cmd/api/main.go               # Montaje modular de rutas y servidor HTTP (Chi)
│   ├── internal/
│   │   ├── common/                   # Conexión SQLite, helpers JSON y CORS
│   │   ├── candidatos/               # MÓDULO LUIS: models.go, handler.go, routes.go
│   │   ├── votantes/                 # MÓDULO EZEQUIEL: models.go, handler.go, routes.go
│   │   └── sistema/                  # MÓDULO JUAN: models.go, handler.go, routes.go
│   ├── data/
│   │   ├── matchcivico.db            # Base de datos SQLite inicializada y cargada
│   │   └── datos_unificados.json     # Dataset crudo INE 2024 (4,584 candidaturas)
│   ├── scripts/
│   │   └── init_sqlite.py            # Script regenerador de SQLite desde JSON
│   ├── go.mod
│   └── go.sum
├── frontend/                         # React Native (Expo SDK 57: Web, Android e iOS)
│   ├── App.tsx                       # Splash de carga + flujo único (sin navbar)
│   ├── src/
│   │   ├── api/client.ts             # Cliente Axios cross-platform (Web, Android Emulator, iOS)
│   │   ├── components/ui/            # Componentes genéricos (Card, Button, Badge)
│   │   ├── flow/                     # Núcleo del flujo: FlowProvider, FlowPager, steps.ts
│   │   ├── splash/SplashScreen.tsx   # Pantalla de carga con imagen placeholder
│   │   └── features/
│   │       ├── candidatos/           # MÓDULO LUIS: api, components, hooks, screens
│   │       ├── votantes/             # MÓDULO EZEQUIEL: api, components, hooks, screens
│   │       └── sistema/              # MÓDULO JUAN: api, components, hooks, screens
│   ├── app.json
│   └── package.json
└── db/
    ├── schema.sql                    # DDL unificado con prefijos por módulo
    └── matchcivico.db                # Base de datos SQLite primaria
```

---

## 🗄️ Base de Datos SQLite

La base de datos SQLite ya está modelada, creada y sembrada con los datos oficiales del INE 2024:
- **4,584 candidatos** federales (Presidencia, Senadurías y Diputaciones) con escolaridad, estatus de título, historial y propuestas.
- **32 entidades federativas** con estadísticas de participación y abstencionismo general y juvenil (18 a 29 años).
- **300 distritos electorales federales**.
- **75,240 etiquetas** de propuestas (`candidatos_etiquetas`) para el árbol de decisión del módulo de Luis. Cómo se generaron y cómo regenerarlas: [`docs/etiquetado_candidatos.md`](docs/etiquetado_candidatos.md).

### Convención de Prefijos (No-Colisión)
Todas las tablas creadas o modificadas **deben** llevar el prefijo del módulo:
- `candidatos_*`
- `votantes_*`
- `sistema_*`

---

## 🚀 Guía de Arranque Rápido

### 1. Backend (Go)
```bash
cd backend
go run ./cmd/api/main.go
# Servidor escuchando en http://localhost:8080
```
Verificar salud:
```bash
curl http://localhost:8080/health
curl http://localhost:8080/api/v1/sistema/status
```

### 2. Frontend (React Native — Web y Móvil)
```bash
cd frontend
npm install

# Para ejecutar en Navegador Web:
npm run web

# Para ejecutar en Móvil (Android / iOS con Expo Go):
npm start
# o
npm run android
npm run ios
```

---

## 🛡️ Regla de Oro de Aislamiento para los 3 Desarrolladores

1. Cada desarrollador trabaja **únicamente** en su carpeta de feature (`internal/<modulo>` en backend y `src/features/<modulo>` en frontend).
2. **Prohibido importar código entre features distintas**. Si necesitas compartir lógica visual genérica, usa `src/components/ui/` o `internal/common/`.
3. Para deshabilitar un módulo (por ejemplo en un demo o refactor), solo se comenta una línea en `cmd/api/main.go` y una en `frontend/src/flow/steps.ts`.
