# Arquitectura del Sistema — Match Cívico

## 1. Visión General y Filosofía de Diseño

El proyecto **Match Cívico** está diseñado bajo los principios de **Arquitectura Vertical ("Package by Feature")**. A diferencia de arquitecturas tradicionales horizontales en capas (e.g. `controllers/`, `services/`, `repositories/`), cada unidad funcional de negocio se encapsula por completo en un paquete aislado.

### ¿Por qué Package by Feature en un Hackathon?
1. **Cero colisiones en Git**: Cada desarrollador es dueño absoluto de su directorio. Ningún desarrollador edita archivos dentro de la carpeta de otro compañero.
2. **Aislamiento de fallos**: Si un módulo tiene un bug o está a medio construir, puede ser deshabilitado comentando exactamente una sola línea en [`cmd/api/main.go`](file:///home/anon/uni/cua9/movil/hackathon/backend/cmd/api/main.go) y una sola línea en [`frontend/src/flow/steps.ts`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/flow/steps.ts), manteniendo el resto de la aplicación 100% operativa y compilable.
3. **Sin sobreingeniería**: Se evita el boilerplate prematuro de interfaces abstractas innecesarias o capas intermedias redundantes. Directo, rápido y robusto.

---

## 2. Mapa Arquitectónico del Monorepo

```text
/home/anon/uni/cua9/movil/hackathon/
├── backend/                          # Servidor API REST en Go 1.22+
│   ├── cmd/api/main.go               # Montaje de Chi Router y arranque del servidor
│   ├── internal/
│   │   ├── common/                   # Conexión DB, Middlewares CORS/Logger y respuestas JSON
│   │   ├── candidatos/               # [Luis] Búsqueda, filtrado y detalle de candidatos
│   │   │   ├── models.go
│   │   │   ├── handler.go
│   │   │   └── routes.go
│   │   ├── votantes/                 # [Ezequiel] Métricas censales INE y perfil de votante
│   │   │   ├── models.go
│   │   │   ├── handler.go
│   │   │   └── routes.go
│   │   └── sistema/                  # [Juan] Reset de app, exportación a PDF y auditoría
│   │       ├── models.go
│   │       ├── handler.go
│   │       └── routes.go
│   ├── data/
│   │   ├── matchcivico.db            # Base de datos SQLite cargada
│   │   └── datos_unificados.json     # Datos INE en bruto
│   └── scripts/
│       └── init_sqlite.py            # Generador/sembrador de base de datos
├── frontend/                         # Aplicación React Native (Expo SDK 57)
│   ├── App.tsx                       # Splash + flujo único sin navbar
│   ├── app.json                      # Configuración Expo (Mobile & Web)
│   └── src/
│       ├── api/client.ts             # Cliente Axios cross-platform
│       ├── components/ui/            # Componentes reutilizables (Card, Button, Badge)
│       ├── flow/                     # Núcleo del flujo (FlowProvider, FlowPager, steps.ts)
│       ├── splash/SplashScreen.tsx   # Carga inicial con imagen placeholder
│       └── features/
│           ├── candidatos/           # [Luis] Feature Candidatos
│           │   ├── api/              # Llamadas a endpoints de candidatos
│           │   ├── components/       # Componentes visuales (CandidateCard, etc.)
│           │   ├── hooks/            # Hooks de estado (useCandidates)
│           │   └── steps/            # Pasos/slides del módulo + steps.ts
│           ├── votantes/             # [Ezequiel] Feature Votantes
│           │   ├── api/              # Llamadas a endpoints censales
│           │   ├── components/       # Componentes visuales (VoterStatsCard, etc.)
│           │   ├── hooks/            # Hooks de estado (useVoterStats)
│           │   └── steps/            # Pasos/slides del módulo + steps.ts
│           └── sistema/              # [Juan] Feature Sistema
│               ├── api/              # Llamadas a endpoints de reset y exportación
│               ├── components/       # Componentes de auditoría y botones de acción
│               ├── hooks/            # Hooks de estado (useSystem)
│               └── steps/            # Pasos/slides del módulo + steps.ts
├── db/
│   ├── schema.sql                    # Definición DDL unificada con prefijos
│   └── matchcivico.db                # Archivo SQLite primario
└── docs/                             # Documentación técnica completa
```

---

## 3. Diagrama de Flujo de Datos

```
[ Cliente Móvil / Web (React Native) ]
                   │
                   ▼ (HTTP / JSON)
        [ Go HTTP Server (Chi) ]
                   │
    ┌──────────────┼──────────────┐
    ▼              ▼              ▼
[ candidatos ] [ votantes ]  [ sistema ]
    │              │              │
    └──────────────┬──────────────┘
                   ▼
     [ SQLite Pool (matchcivico.db) ]
        ├── candidatos_candidatos
        ├── votantes_entidades
        ├── votantes_distritos
        ├── votantes_perfiles
        ├── sistema_resets
        └── sistema_exportaciones
```

---

## 4. Regla de Aislamiento y No-Colisión

Para comprobar que la arquitectura está perfectamente desacoplada:
- Si se desactiva el módulo de `votantes` de Ezequiel:
  1. En `backend/cmd/api/main.go`, comentar la línea `votantes.RegisterRoutes(r, db)`.
  2. En `frontend/src/flow/steps.ts`, comentar la línea `...votantesSteps` y su import.
  3. Ejecutar `go build ./...` y `npx tsc --noEmit`. Ambos proyectos compilan con 0 errores.
- **Conclusión arquitectónica**: No existen imports cruzados entre `candidatos`, `votantes` y `sistema`. Toda comunicación cruzada o reutilización de componentes se realiza exclusivamente a través de los paquetes base (`common` en backend y `components/ui` / `api/client.ts` en frontend).
