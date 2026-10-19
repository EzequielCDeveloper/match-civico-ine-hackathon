# Protocolo de Trabajo en Git y Colaboración en Paralelo

## 1. Estrategia de Ramas (Branching Model)

Para evitar colisiones entre los 3 desarrolladores durante el hackathon, se utiliza un modelo de ramas por funcionalidad y rol:

```text
       main (Demo & Release)
        ▲
        │ (PRs revisadas y fusionadas por Juan)
   ┌────┴───────────────────────────┬───────────────────────────┐
   │                                │                           │
feature/candidatos-luis   feature/votantes-ezequiel    feature/sistema-juan
(Luis: Candidatos)        (Ezequiel: Votantes)         (Juan: Sistema & Merge Master)
                                                                │
                                                        qa/audit-aleksey
                                                        (Aleksey: Auditoría & QA)
```

### Tabla de Ramas Oficiales
| Desarrollador | Rama de Trabajo | Directorio Exclusivo Backend | Directorio Exclusivo Frontend |
| :--- | :--- | :--- | :--- |
| **Luis** | `feature/candidatos-luis` | `backend/internal/candidatos/` | `frontend/src/features/candidatos/` |
| **Ezequiel** | `feature/votantes-ezequiel` | `backend/internal/votantes/` | `frontend/src/features/votantes/` |
| **Juan** | `feature/sistema-juan` | `backend/internal/sistema/` | `frontend/src/features/sistema/` |
| **Aleksey** | `qa/audit-aleksey` | `backend/tests/` o auditoría | Auditoría de UI/UX y pentesting |

---

## 2. Zona de Acceso Restringido (Archivos Críticos)

Los siguientes archivos son los únicos puntos de convergencia entre los módulos. **No deben ser modificados durante el hackathon** salvo acuerdo explícito del equipo:

1. [`backend/cmd/api/main.go`](file:///home/anon/uni/cua9/movil/hackathon/backend/cmd/api/main.go): Ya tiene montados los routers de los 3 módulos.
2. [`frontend/src/flow/steps.ts`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/flow/steps.ts): Registro ordenado de los pasos de los 3 módulos (orden = recorrido del usuario). Junto con `frontend/App.tsx` y `src/flow/*` es núcleo compartido.
3. [`frontend/src/api/client.ts`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/api/client.ts): Ya tiene configurado el cliente Axios con soporte Web y Android.
4. [`db/schema.sql`](file:///home/anon/uni/cua9/movil/hackathon/db/schema.sql): Ya tiene definidas las 6 tablas con sus prefijos.

*Al respetar esta regla, ningún merge generará conflictos en Git.*

---

## 3. Protocolo de Fusión para Juan (Merge Master)

Como responsable de fusionar ramas y corregir errores de fusión, Juan debe seguir el siguiente flujo estricto al integrar las ramas de Luis y Ezequiel a `main`:

### Paso 1: Actualizar rama local de Juan
```bash
git checkout main
git pull origin main
```

### Paso 2: Probar la fusión de la feature
```bash
git checkout -b merge/candidatos-luis main
git merge feature/candidatos-luis
```

### Paso 3: Validación OBLIGATORIA (La regla de oro)
Antes de hacer push o fast-forward a `main`, ejecutar los dos linters/compiladores:
```bash
# 1. Validar Backend Go
cd backend && go build ./...

# 2. Validar Frontend TypeScript
cd ../frontend && npx tsc --noEmit
```
Si ambos comandos finalizan con código de salida `0`:
```bash
git checkout main
git merge merge/candidatos-luis
git push origin main
```

---

## 4. Convención de Mensajes de Commit (Conventional Commits)

Utilizar formato estándar para mantener un historial limpio y legible:
- `feat(candidatos): agregar selector de circunscripción electoral`
- `feat(votantes): calcular brecha de género en segmento joven`
- `fix(sistema): corregir formato de descarga de reporte PDF`
- `docs: actualizar documentación de endpoints en api_reference.md`
- `test: agregar prueba de inyección SQL en filtro de candidatos`
