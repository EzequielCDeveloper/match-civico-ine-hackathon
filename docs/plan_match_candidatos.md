# Plan: match de candidaturas que llegue a una persona concreta

Estado: propuesta. Módulo: candidatos (Luis). Fecha límite de entrega del hackathon: 31 de octubre de 2026.

---

## 1. Por qué el recorrido actual se siente simple

El código está en `frontend/src/features/candidatos/match/tree.ts` y `steps/CandidatosSwipeStep.tsx`.

1. **Mezcla boletas.** Junta en una sola bolsa a todos los propietarios del estado: presidencia, senaduría y las diputaciones de todos los distritos. En Jalisco son 62 personas. Nadie vota por 62. El resultado puede recomendar a un diputado de un distrito donde la persona no vota.
2. **No se adapta.** `siguientePregunta` elige la etiqueta que mejor parte a *todos* los candidatos, sin mirar las respuestas. Dos personas que responden distinto ven las mismas seis tarjetas, en el mismo orden.
3. **Premia a quien no se mostró.** La tarjeta enseña la propuesta de un candidato, pero el "me convence" suma a todos los que comparten el tema. Si te gusta la propuesta de salud de A, también sube B, aunque B proponga lo contrario.
4. **Solo usa el tema.** Las etiquetas de enfoque (castigo, prevención, becas, infraestructura…), la concreción y si la propuesta corresponde al cargo ya están calculadas y no se usan.
5. **Dos respuestas y un tope fijo.** Solo hay "me interesa" o "descartar", siempre son 6 tarjetas y al final salen 3 nombres sin decir por qué ni qué tan seguro es el resultado.
6. **Las etiquetas son por candidato, no por propuesta.** Decider etiquetó `propuesta_1` y `propuesta_2` juntas. Por eso fue necesario un parche de palabras clave para que el texto de la tarjeta coincida con su tema.

## 2. Lo que dicen los datos

Conteo de candidaturas **propietarias con al menos una propuesta**:

| Boleta | Candidaturas por persona votante |
| :--- | :--- |
| Diputación de mayoría relativa (por distrito) | de 1 a 5, mediana 3 |
| Senaduría de mayoría relativa (por estado) | de 4 a 11, mediana 6 |
| Presidencia | 3 |
| Representación proporcional | listas nacionales de 89 a 132 por circunscripción |

Con 3 a 6 opciones por boleta, sí es realista identificar a **una persona exacta** en 6 a 10 tarjetas. Con 62 mezcladas no lo es.

Otros datos que el plan tiene en cuenta:

- 114 candidaturas no tienen ningún tema con probabilidad de 0.5 o más. Sus textos son genéricos y van a quedar empatadas si solo se usan temas.
- 175 propietarios de diputación de mayoría no registraron propuestas. No se pueden comparar a ciegas y deben aparecer aparte, no desaparecer.

---

## 3. Recorrido nuevo

Cinco momentos. Todo el cálculo sigue en el teléfono; las respuestas no se mandan al servidor.

### 3.1. Elegir la boleta

1. Estado: se reutiliza la respuesta de `votantes.perfil` (Ezequiel).
2. **Distrito**, paso nuevo dentro de candidatos. La lista sale de `GET /api/v1/votantes/entidades/{id}`, que ya trae los distritos con su cabecera ("10 - Zapopan"). Esto es usar la API, no importar código de otro módulo.
3. Boleta a comparar: diputación del distrito (por defecto, la más acotada), senaduría del estado o presidencia. Al terminar una boleta se ofrece seguir con la siguiente.

Representación proporcional queda fuera: son listas de partido, no personas que uno elige.

### 3.2. Prioridades

Antes de comparar propuestas, la persona ordena o marca hasta 3 temas que más le importan. Eso no elimina a nadie, solo cambia cuánto pesa cada tarjeta. Si la persona ya escogió temas en el paso de Ezequiel, se usan como punto de partida.

### 3.3. Tarjetas adaptativas

Cada tarjeta es **una propuesta real de una sola candidatura**, sin nombre ni partido. Tres respuestas:

- **Me convence**
- **Me da igual**
- **No me convence**

La siguiente tarjeta se elige según lo que queda en duda (sección 4). Se alternan dos formatos:

- **Una propuesta:** se juzga sola.
- **Dilema:** dos propuestas del mismo tema y enfoque distinto ("aumentar penas" frente a "atender causas sociales"), y la persona elige una. Separa más rápido a candidaturas que hablan de lo mismo.

### 3.4. Confirmación

Cuando una candidatura queda claramente arriba, se muestra a ciegas **su otra propuesta**. Si la persona la rechaza, el recorrido sigue en lugar de cerrar con un falso positivo.

### 3.5. Resultado

- Nombre, partido y porcentaje de afinidad de cada candidatura de la boleta, en orden.
- Por qué: "Coincidiste con 4 de sus 5 propuestas mostradas; no te convenció su enfoque en seguridad".
- Sus dos propuestas completas, escolaridad y trayectoria.
- Avisos: "promete cosas que no corresponden al cargo" si `competencia_cargo` es bajo, y "propuestas poco concretas" si `concrecion` es bajo.
- Si hay empate, se dice que hay empate. No se inventa un ganador.
- Lista aparte: "Estas candidaturas no registraron propuestas".
- Nada de correo, teléfono, redes ni página web.

---

## 4. El motor

Reemplaza a `tree.ts`. Funciones puras, sin red, para poder probarlas.

### 4.1. Creencia sobre cada candidatura

Se mantiene una probabilidad para cada candidatura de la boleta: qué tan probable es que sea "la tuya". Empieza pareja y se actualiza con cada respuesta (actualización bayesiana):

```text
P(c | respuestas) ∝ P(c) × Π P(respuesta | c)
```

### 4.2. Qué significa cada respuesta

Para una tarjeta con la propuesta `t`, la probabilidad de la respuesta depende de qué tan parecida es `t` a lo que propone cada candidatura `c`:

```text
s(c, t) = similitud entre t y las propuestas de c       (1 si t es de c)
P(me convence | c)    = ε + (1 − 3ε) · s(c, t)
P(no me convence | c) = ε + (1 − 3ε) · (1 − s(c, t))
P(me da igual | c)    = ε + peso pequeño fijo
```

`ε` absorbe el ruido: la gente no responde perfectamente consistente. Un "me da igual" casi no mueve la creencia. Un dilema funciona igual, pero compara `s(c, A)` con `s(c, B)`.

La similitud `s` se arma con lo que ya existe y con lo que se agrega en la sección 5:

- mismo tema (`eje_*`) y mismo enfoque (`enfoque_*`): parecido;
- mismo tema y enfoque distinto: poco parecido;
- similitud del texto por embeddings: desempata cuando las etiquetas no alcanzan;
- prioridades de 3.2 como multiplicador del peso de la tarjeta.

### 4.3. Elegir la siguiente tarjeta

Entre todas las propuestas que aún no se mostraron, se elige la que **más reduce la incertidumbre esperada** sobre quién es la candidatura correcta (ganancia de información):

```text
siguiente = argmax_t  H(creencia) − Σ_r P(r) · H(creencia después de r)
```

Con 3 a 11 candidaturas y unas 20 propuestas por boleta, esto se calcula completo en el teléfono en milisegundos. No hacen falta atajos.

### 4.4. Cuándo parar

- La primera candidatura supera 0.70 de probabilidad **y** le saca al menos 0.25 a la segunda: pasa a confirmación (3.4).
- Mínimo 5 tarjetas, aunque parezca resuelto con menos.
- Máximo 12. Si se llega al tope, el resultado se presenta como empate entre las que sigan cerca.
- Si quedan menos de 2 candidaturas con propuestas, no hay comparación: se muestra directamente.

---

## 5. Cambios en los datos

### 5.1. Etiquetar cada propuesta por separado

Volver a correr `etiquetar.py` con cada texto por su cuenta (versión 3 de la taxonomía): `propuesta_1`, `propuesta_2` y `propuesta_genero`. Son unos 4,900 textos en lugar de 1,710: alrededor de 2 horas y cuarto en la 3060 Ti.

`propuesta_genero` entra, pero no como un tema más. El INE se la pide a casi todas las candidaturas (1,711 de 2,297 propietarios), así que marcarla como "mujeres" no separaría a nadie. Lo que sí separa es el enfoque y qué tan concreta es:

| Enfoque | Ejemplo |
| :--- | :--- |
| Violencia | Refugios, alertas, tipificar delitos |
| Autonomía económica | Empleo, igualdad salarial, créditos |
| Cuidados | Estancias infantiles, sistema de cuidados |
| Paridad | Participación política y cargos |
| Salud y derechos reproductivos | — |
| Genérica | "Promoveré la igualdad sustantiva", sin una acción |

En el recorrido solo se usa como dilema entre dos enfoques, o cuando la persona marcó mujeres o igualdad de género entre sus prioridades. La concreción aparta las que son puro trámite.

La tabla nueva:

```sql
CREATE TABLE IF NOT EXISTS candidatos_propuesta_etiquetas (
    id_anonimo INTEGER NOT NULL,
    propuesta  INTEGER NOT NULL,   -- 1, 2 o 3 (3 = propuesta_genero)
    etiqueta   TEXT NOT NULL,
    peso       REAL NOT NULL,
    PRIMARY KEY (id_anonimo, propuesta, etiqueta)
);
```

Esto elimina el parche de palabras clave: la tarjeta de "Campo" muestra una propuesta etiquetada como campo.

### 5.2. Embeddings de cada propuesta

Calcular un vector por propuesta con un modelo multilingüe local (por ejemplo `intfloat/multilingual-e5-base`, cabe sobrado en la GPU) y guardar, **por boleta**, la similitud entre cada par de propuestas. Así el teléfono no necesita el modelo: recibe una matriz pequeña.

### 5.3. Texto legible

Limpiar mayúsculas sostenidas y cortar en la última oración completa antes de unos 500 caracteres. Hoy se hace en el cliente; conviene hacerlo una vez en el script y guardar `propuesta_1_corta`, `propuesta_2_corta` y `propuesta_genero_corta`.

---

## 6. API

Un solo endpoint nuevo en `internal/candidatos` que reemplaza a `para-match`:

```text
GET /api/v1/candidatos/boleta?entidad=JALISCO&distrito=10&cargo=DIPUTACION_MR
```

Respuesta:

```json
{
  "cargo": "DIPUTACIÓN FEDERAL MR",
  "candidatos": [
    { "id_anonimo": 812, "nombre_candidato": "…", "partido_coalicion": "…",
      "escolaridad": "…", "trayectoria_politica": "…",
      "concrecion": 0.71, "competencia_cargo": 0.64 }
  ],
  "propuestas": [
    { "id": "812-1", "id_anonimo": 812, "texto": "…",
      "etiquetas": { "eje_salud": 0.93, "enfoque_salud.medicamentos": 0.61 } }
  ],
  "similitud": { "812-1": { "905-2": 0.42 } },
  "sin_propuestas": [ { "nombre_candidato": "…", "partido_coalicion": "…" } ]
}
```

`nombre_candidato` y `partido_coalicion` vienen en la respuesta porque el resultado los revela al final. Las tarjetas no deben mostrarlos.

---

## 7. Cómo saber que funciona

Antes de tocar la interfaz, un simulador en Python (`backend/scripts/etiquetado/simular_match.py`):

1. Para cada boleta del país, elegir cada candidatura como "la verdadera".
2. Simular a una persona que responde según las propuestas de esa candidatura, con un 15 % de respuestas al azar.
3. Correr el motor y registrar si acierta y en cuántas tarjetas.

Metas para la diputación de mayoría:

| Métrica | Meta |
| :--- | :--- |
| La primera del resultado es la candidatura verdadera | 80 % o más |
| La candidatura verdadera queda entre las dos primeras | 95 % o más |
| Tarjetas promedio | 10 o menos |

Medición del 22 de octubre, con las etiquetas por propuesta y la similitud por boleta, sobre las 281 boletas de diputación de mayoría que tienen al menos dos candidaturas con propuestas (798 casos, 15 % de respuestas al azar):

| Métrica | Resultado | Meta |
| :--- | :--- | :--- |
| La primera del resultado es la candidatura verdadera | 95.0 % | 80 % |
| La candidatura verdadera queda entre las dos primeras | 99.5 % | 95 % |
| Tarjetas promedio | 5.7 | 10 o menos |

El simulador es `backend/scripts/etiquetado/simular_match.py`.

---

## 8. Orden de trabajo

Del 22 al 31 de octubre. Los datos van primero: el motor y las tarjetas leen etiquetas por propuesta, y rehacerlas después obligaría a medir el simulador dos veces.

| Fase | Qué | Días |
| :--- | :--- | :--- |
| 1 | Etiquetas por propuesta, incluida `propuesta_genero` con su enfoque (5.1), y texto legible (5.3). El lote de Decider corre solo: unas 2 horas y cuarto | 1 |
| 1 | Embeddings y similitud por boleta (5.2) | 1 |
| 2 | Paso de distrito y boleta; endpoint `boleta`; motor bayesiano con tres respuestas, ganancia de información y regla de parada; resultado con porcentaje, razones y lista sin propuestas | 3 |
| 2 | Simulador y primera medición | 1 |
| 3 | Prioridades (3.2), dilemas de enfoque (incluida la propuesta de género), confirmación (3.4) y avisos de concreción y cargo | 1 |
| — | Margen para pruebas en el teléfono y para la demo | 1 |

Si el tiempo no alcanza, la fase 3 es la que se recorta. El motor de la fase 2 ya funciona con las etiquetas de la fase 1 y sin los dilemas.

## 9. Riesgos

- **Distritos con una sola candidatura con propuestas.** No hay nada que comparar: se muestra la candidatura y se dice por qué.
- **Etiquetas de Decider equivocadas.** Las dos defensas son las tres respuestas con `ε` (un error no hunde a nadie) y la tarjeta de confirmación con la otra propuesta.
- **Textos casi idénticos entre partidos de la misma coalición.** Saldrán empatados, y es correcto decirlo así.
- **Dependencia del paso de Ezequiel.** El estado sale de `votantes.perfil`. Si ese paso cambia de forma, el de distrito debe poder pedir el estado por su cuenta.
