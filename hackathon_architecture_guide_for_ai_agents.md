# Spec: Monorepo Paralelo Go + React para Hackathons (3 Devs)

> **Instrucción para el Agente de IA**: Este documento define las reglas de scaffolding, directrices de arquitectura vertical ("Package by Feature") y protocolos de no colisión en Git para un equipo de 3 desarrolladores en un hackathon. Implementa este proyecto siguiendo estrictamente las convenciones descritas a continuación.

---

## 1. Contexto y Objetivos

- **Stack**: Go (Backend HTTP vía `chi`) + React (Frontend SPA vía Vite + TypeScript).
- **Meta**: Permitir desarrollo en paralelo extremo de 3 módulos de negocio minimizando colisiones en Git (`merge conflicts`) y desacoplando el ciclo de vida del backend y frontend.
- **Regla de oro de diseño**: **Sin arquitectura hexagonal ni abstracciones prematuras.** No usar interfaces innecesarias, capas DTO redundantes ni generadores de código complejos.

---

## 2. Mapa de Repositorio y Asignación de Roles

```text
/
├── backend/
│   ├── cmd/api/main.go               # Orquestación de arranque y montaje de rutas
│   ├── internal/
│   │   ├── common/                   # Conexión DB, middlewares CORS/Logger
│   │   ├── module_a/                 # Asignado a Dev 1
│   │   ├── module_b/                 # Asignado a Dev 2
│   │   └── module_c/                 # Asignado a Dev 3
│   ├── go.mod
│   └── go.sum
├── frontend/
│   ├── src/
│   │   ├── api/client.ts             # Cliente Axios/Fetch central
│   │   ├── components/ui/            # Componentes genéricos compartidos
│   │   ├── features/
│   │   │   ├── module_a/             # Asignado a Dev 1
│   │   │   ├── module_b/             # Asignado a Dev 2
│   │   │   └── module_c/             # Asignado a Dev 3
│   │   ├── App.tsx                   # Declaración de rutas globales
│   │   └── main.tsx
│   ├── package.json
│   └── vite.config.ts
└── db/
    └── schema.sql                    # Definición DDL unificada
```

---

## 3. Especificación Backend (Go)

### 3.1. Convención de Módulos (`internal/<module>/`)
Cada módulo es completamente autocontenido dentro de su paquete. Prohibido crear carpetas horizontales globales como `controllers/`, `services/` o `repositories/`.

Cada módulo debe implementar:
1. `models.go`: Structs del dominio y payloads JSON (Request/Response).
2. `handler.go`: Manejadores HTTP que reciben `http.ResponseWriter` y `*http.Request`.
3. `routes.go`: Función pública `RegisterRoutes(r chi.Router, db *sql.DB)` que ancla sus endpoints al router.

#### Plantilla para Módulo Go: `internal/<module>/routes.go`
```go
package <module>

import (
	"database/sql"
	"net/http"
	"github.com/go-chi/chi/v5"
)

type Handler struct {
	db *sql.DB
}

func RegisterRoutes(r chi.Router, db *sql.DB) {
	h := &Handler{db: db}

	r.Route("/<module>", func(r chi.Router) {
		r.Get("/", h.List)
		r.Post("/", h.Create)
		r.Get("/{id}", h.GetByID)
	})
}
```

### 3.2. Punto de Montaje (`cmd/api/main.go`)
El punto de entrada únicamente configura dependencias globales y llama al `RegisterRoutes` de cada módulo:

```go
package main

import (
	"log"
	"net/http"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"

	"app/internal/common"
	"app/internal/module_a"
	"app/internal/module_b"
	"app/internal/module_c"
)

func main() {
	db := common.InitDB()
	r := chi.NewRouter()

	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(common.CorsMiddleware)

	r.Route("/api/v1", func(r chi.Router) {
		module_a.RegisterRoutes(r, db)
		module_b.RegisterRoutes(r, db)
		module_c.RegisterRoutes(r, db)
	})

	log.Println("Server running on :8080")
	http.ListenAndServe(":8080", r)
}
```

---

## 4. Especificación Frontend (React + TS)

### 4.1. Convención de Features (`src/features/<module>/`)
Cada desarrollador trabaja exclusivamente dentro de su directorio de feature. Queda prohibido depender de componentes o hooks de otras features.

Estructura interna requerida:
- `api/<module>.api.ts`: Funciones asíncronas para consumo de endpoints del backend.
- `components/`: Componentes visuales exclusivos del módulo.
- `hooks/`: Lógica de consumo de datos y estado local.
- `pages/<Module>Page.tsx`: Vista raíz exportada para el enrutador.

#### Plantilla para Cliente de API: `src/features/<module>/api/<module>.api.ts`
```typescript
import { apiClient } from '../../../api/client';

export interface Item {
  id: string | number;
  name: string;
}

export const fetchItems = async (): Promise<Item[]> => {
  const { data } = await apiClient.get<Item[]>('/api/v1/<module>');
  return data;
};

export const createItem = async (payload: Omit<Item, 'id'>): Promise<Item> => {
  const { data } = await apiClient.post<Item>('/api/v1/<module>', payload);
  return data;
};
```

### 4.2. Cliente HTTP Base: `src/api/client.ts`
```typescript
import axios from 'axios';

export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8080',
  headers: {
    'Content-Type': 'application/json',
  },
});
```

---

## 5. Protocolo de Trabajo en Git

1. **Ramas Protegidas e Hilos de Trabajo:**
   - `main`: Rama de despliegue continuo / demo.
   - Cada desarrollador trabaja en:
     - Dev 1: `feature/module-a`
     - Dev 2: `feature/module-b`
     - Dev 3: `feature/module-c`

2. **Zonas de Acceso Restringido (Archivos Críticos):**
   - `backend/cmd/api/main.go`
   - `frontend/src/App.tsx`
   - `frontend/src/api/client.ts`
   - `db/schema.sql`
   *Regla*: Estos archivos solo se modifican una vez al inicializar el repositorio para registrar los stubs de los 3 módulos, evitando ediciones posteriores durante el hackathon.

3. **Manejo de Base de Datos:**
   - Centralizar en `db/schema.sql`.
   - Cada tabla debe incluir el prefijo del módulo para evitar colisiones de nombrado (ej: `modulea_users`, `moduleb_candidates`, `modulec_votes`).

---

## 6. Instrucciones de Ejecución para Agente de IA

Cuando se te solicite implementar o inicializar este proyecto, ejecuta los siguientes pasos en orden:

1. **Scaffolding Backend**:
   - Inicializa el módulo Go: `go mod init app`.
   - Instala `chi`: `go get -u github.com/go-chi/chi/v5`.
   - Crea `internal/common/db.go` y `internal/common/middleware.go`.
   - Genera los esqueletos de los 3 módulos solicitados con endpoints de prueba (`GET /` retornando un array vacío).
   - Monta todos los módulos en `cmd/api/main.go`.

2. **Scaffolding Frontend**:
   - Genera la estructura base de Vite + React + TypeScript.
   - Configura `src/api/client.ts`.
   - Genera los directorios `src/features/<module>/` con sus respectivas páginas mínimas.
   - Configura las rutas en `src/App.tsx` apuntando a las páginas de cada módulo.

3. **Verificación de Aislamiento**:
   - Asegúrate de que borrar cualquiera de las carpetas de módulos (`module_b` o `module_c`) solo requiera comentar una línea en `main.go` y una en `App.tsx` para que el proyecto siga compilando exitosamente.