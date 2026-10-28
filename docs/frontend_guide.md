# Guía de Desarrollo Frontend (React Native + Web) — Match Cívico

## 1. Stack Tecnológico Frontend

- **Framework**: React Native con **Expo SDK 57**.
- **Lenguaje**: TypeScript (`~6.0.3` / `~5.3+`).
- **Soporte Multiplataforma**: Un solo código fuente para:
  - **Navegadores Web**: Vía `react-native-web` y Metro Bundler.
  - **Móvil Android**: Vía Expo Go / Emulador Android / APK.
  - **Móvil iOS**: Vía Expo Go / Simulador iOS.
- **Cliente HTTP**: Axios centralizado con detección inteligente de host.

---

## 2. Convención de Módulos ("Package by Feature")

El frontend reside en [`frontend/src/features/`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/features/). Cada desarrollador trabaja estrictamente dentro de su carpeta de feature:

```text
src/features/<modulo>/
├── api/
│   └── <modulo>.api.ts       # Funciones async que consumen los endpoints de Go
├── components/
│   └── ComponenteLocal.tsx   # Componentes visuales exclusivos del módulo
├── hooks/
│   └── use<Modulo>.ts        # Lógica de fetching, filtrado y estado local
├── steps/
│   └── <Nombre>Step.tsx      # Un slide por archivo (usa StepContainer)
├── types.ts              # Contrato de respuestas que este módulo escribe
└── steps.ts              # export const <modulo>Steps: FlowStep[] (orden de slides)
```

### Reglas de Oro de Estilo y Dependencias
1. **No acoplamiento entre features**: Prohibido que `features/candidatos` importe nada dentro de `features/votantes` o `features/sistema`.
2. **Componentes compartidos**: Componentes de propósito general (botones, tarjetas, badges) deben residir en [`src/components/ui/`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/components/ui/).
3. **Manejo de estado**: Cada feature encapsula su propio estado dentro de sus hooks con `useState`, `useCallback` y `useEffect`.

---

## 3. Componentes Compartidos (`src/components/ui/`)

### `Card` ([`src/components/ui/Card.tsx`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/components/ui/Card.tsx))
Contenedor con sombra suave, bordes redondeados y fondo blanco uniforme.
```tsx
import { Card } from '../../../components/ui/Card';

<Card>
  <Text>Contenido de tarjeta</Text>
</Card>
```

### `Button` ([`src/components/ui/Button.tsx`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/components/ui/Button.tsx))
Botón táctil accesible con soporte para estados `loading`, `disabled` y variantes (`primary`, `secondary`, `danger`).
```tsx
import { Button } from '../../../components/ui/Button';

<Button
  title="Filtrar Candidatos"
  onPress={handleFilter}
  variant="primary"
  loading={loading}
/>
```

### `Badge` ([`src/components/ui/Badge.tsx`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/components/ui/Badge.tsx))
Etiqueta compacta para cargos, estatus y títulos académicos (`info`, `success`, `warning`).
```tsx
import { Badge } from '../../../components/ui/Badge';

<Badge label="Con Título" variant="success" />
```

---

## 4. Resolución de Red Multiplataforma (`src/api/client.ts`)

En desarrollo local, la URL del backend cambia según la plataforma del cliente:
- **Navegador Web**: Conecta a `http://localhost:8080`.
- **Emulador Android**: Conecta a `http://10.0.2.2:8080` (alias interno de Android para la máquina anfitriona).
- **Dispositivo Móvil Físico**: Configurar variable de entorno `EXPO_PUBLIC_API_URL=http://<TU_IP_LOCAL>:8080`.

El cliente [`src/api/client.ts`](file:///home/anon/uni/cua9/movil/hackathon/frontend/src/api/client.ts) ya detecta esto automáticamente mediante `Platform.OS`.

---

## 5. Cómo Ejecutar el Frontend

Desde el directorio `frontend/`:

### En Navegador Web
```bash
cd frontend
npm run web
```
Abre automáticamente la aplicación en `http://localhost:8081` con recarga en vivo (Hot Module Reloading).

### En Móvil (Expo Go)
```bash
cd frontend
npm start
```
Muestra un código QR en la terminal. Escanéalo con la app **Expo Go** (disponible en Google Play Store y Apple App Store) para probarlo directamente en tu teléfono en la misma red Wi-Fi.

### En Emulador Android
```bash
npm run android
```

---

## 6. Verificación de Compilación y Tipado TypeScript

Antes de hacer commit, cada desarrollador debe validar que sus cambios compilan con 0 errores de tipos:
```bash
cd frontend
npx tsc --noEmit
```
Para probar la compilación de producción para Web:
```bash
npx expo export -p web
```


---

## 7. Modelo de UI: Flujo Único (sin navbar)

La app NO tiene navegación por pestañas. Es **una sola interfaz lineal** de "pasos" (slides) que se desliza sola al responder, tanto entre módulos como entre las partes de un mismo módulo.

```text
Splash (imagen placeholder) -> votantes.* -> candidatos.* -> sistema.*   (ver src/flow/steps.ts)
```

### 7.1. Piezas del núcleo (`src/flow/`, compartido, no tocar)
| Pieza | Rol |
| :--- | :--- |
| `FlowProvider` / `useFlow()` | Estado del flujo: `next()`, `back()`, `goTo(id)`, `restart()`, `answers`, `setAnswer()` |
| `FlowPager` | Renderiza el paso actual y lo desliza automáticamente (derecha = avanzar, izquierda = volver) |
| `FlowShell` | Barra de progreso superior + botón volver + pager |
| `steps.ts` | **Archivo restringido**: concatena `votantesSteps`, `candidatosSteps`, `sistemaSteps`. El orden define el recorrido |

### 7.2. Cómo crear un paso (slide)
1. Crea `features/<modulo>/steps/MiPasoStep.tsx` con `StepContainer`.
2. Al obtener la respuesta, guarda y avanza: `setAnswer('<modulo>.clave', valor); next();`
3. Regístralo en `features/<modulo>/steps.ts` (`{ id: '<modulo>.mi-paso', Component: MiPasoStep }`). El orden del arreglo es el orden de los slides.

```tsx
export const MiPasoStep: React.FC = () => {
  const { next, setAnswer } = useFlow();
  return (
    <StepContainer title="Pregunta">
      <ChoiceList options={[{ label: 'Sí', value: true }]} onSelect={(v) => { setAnswer('modulo.clave', v); next(); }} />
    </StepContainer>
  );
};
```

### 7.3. Respuestas compartidas entre módulos
Las respuestas viven en `answers` (clave -> valor). **Solo el módulo dueño escribe** su clave (prefijo del módulo); los demás solo leen con `useAnswer<T>('clave')`. **Prohibido importar código de otra feature**: el contrato de cada clave se documenta en el `types.ts` del módulo dueño.

| Clave | Dueño | Forma |
| :--- | :--- | :--- |
| `votantes.perfil` | votantes | `{ edad, entidad_id, entidad, temas[] }` |
| `candidatos.liked` | candidatos | `[{ id, nombre }]` |

### 7.4. Swipe tipo Tinder
`components/ui/SwipeDeck.tsx` es izquierda o derecha (los temas). `components/ui/SwipeCuatro.tsx` es las cuatro direcciones (las propuestas: derecha sí, izquierda no, arriba o abajo me da igual). En nativo el gesto es `PanResponder`. En web lo toma un evento de puntero y el texto de la tarjeta no se puede seleccionar, para que el navegador no se quede el arrastre. Los dos dejan botones por si no se puede deslizar.
```tsx
<SwipeDeck
  items={items}
  keyExtractor={(i) => i.id}
  renderCard={(i) => <MiTarjeta item={i} />}
  leftLabel="Descartar" rightLabel="Me gusta"
  onFinish={(results) => { /* results: {item, direction}[] */ next(); }}
/>
```
Úsalo en cualquier paso donde la interacción sea "sí/no" sobre una lista. Para respuestas de opción única usa `ChoiceList`.

### 7.5. Splash de carga
`src/splash/SplashScreen.tsx` muestra `assets/splash-placeholder.png` (reemplázala conservando el nombre) mientras hace ping a `/health`; dura mínimo 2 s y nunca bloquea si el backend está caído.
