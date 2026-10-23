# Etiquetado y match por boleta — Módulo Candidatos (Luis)

Cómo se pasa de los textos de Conóceles a una boleta concreta y a un nombre. Las respuestas de la persona no salen del teléfono. Lo que sí se calcula una vez, en la máquina de desarrollo, son las etiquetas y la similitud entre propuestas.

El plan y la medición están en [`plan_match_candidatos.md`](plan_match_candidatos.md). Qué parte de esto es dato del INE y qué parte no, está en [`uso_datos_ine.md`](uso_datos_ine.md).

---

## 1. Qué se etiqueta

Cada texto va por su cuenta. No se juntan `propuesta_1` y `propuesta_2` en una sola llamada.

| `propuesta` | Campo de Conóceles | Preguntas |
| :--- | :--- | :--- |
| 1 | `propuesta_1` | 21 ejes, 5 enfoques, concreción y si corresponde al cargo |
| 2 | `propuesta_2` | Las mismas |
| 3 | `propuesta_genero` | Solo el enfoque de género, concreción y si corresponde al cargo |

`propuesta_genero` no se marca como el eje "mujeres". El INE se la pide a casi todas las candidaturas, así que ese eje dejaría de distinguir. El enfoque sí distingue: violencia, autonomía económica, cuidados, paridad, salud y derechos reproductivos, o genérica. En la app solo entra si la persona marcó mujeres o igualdad de género entre sus prioridades.

La lista cerrada es [`backend/scripts/etiquetado/taxonomia.json`](../backend/scripts/etiquetado/taxonomia.json), versión 3. El modelo es Decider-2B (`Mapika/decider-2b` v11), en local, con el mismo `POST /v1/systemone` que Jev. No escribe texto: devuelve una probabilidad por opción.

Los pesos quedan en `candidatos_propuesta_etiquetas`:

| Etiqueta | Peso |
| :--- | :--- |
| `eje_<tema>` | Probabilidad de que ese texto trate el tema. |
| `enfoque_<eje>.<opcion>` | Probabilidad de la opción multiplicada por la de su eje. `no_aplica` no se guarda. |
| `enfoque_genero.<opcion>` | Probabilidad de la opción, sin multiplicar por un eje. |
| `concrecion` | Nivel de la escala de 3, dividido entre 2. |
| `competencia_cargo` | Probabilidad de que lo prometido lo pueda hacer alguien en ese cargo. |

Estado al 22 de octubre de 2026: **5,131 textos** y **164,168 etiquetas**. Las respuestas crudas están en `backend/data/candidatos_etiquetas_raw.jsonl`. Si `init_sqlite.py` borra la base, volver a correr el script recarga la tabla desde ese archivo y no llama otra vez al modelo.

```bash
python3 backend/scripts/etiquetado/etiquetar.py
python3 backend/scripts/etiquetado/etiquetar.py --limit 6
```

## 2. Similitud entre propuestas

[`embeddings.py`](../backend/scripts/etiquetado/embeddings.py) calcula un vector por extracto con `intfloat/multilingual-e5-base` y guarda, solo dentro de cada boleta, el coseno entre cada par. El archivo es `db/similitud.db` (tabla `pares`). Son 3,130 textos de diputación de mayoría, senaduría de mayoría y presidencia, y 17,454 pares.

En el motor ese número solo desempata. Si las etiquetas ya dicen que dos propuestas son del mismo tema y el mismo enfoque, o de temas distintos, el coseno no se mezcla. Usarlo siempre bajó el acierto en el simulador.

## 3. Cómo elige la siguiente tarjeta

El código del teléfono está en [`frontend/src/features/candidatos/match/motor.ts`](../frontend/src/features/candidatos/match/motor.ts). El mismo cálculo, para medirlo, está en [`motor.py`](../backend/scripts/etiquetado/motor.py).

1. La persona elige estado (paso de Ezequiel), distrito y boleta: diputación de su distrito, senaduría de su estado o presidencia. La representación proporcional no entra.
2. Marca hasta tres temas. No eliminan a nadie: solo suben la prioridad de esas tarjetas.
3. Cada tarjeta es una propuesta real, sin nombre ni partido. Hay tres respuestas: me convence, me da igual, no me convence. A veces son dos propuestas del mismo tema y distinto enfoque, y hay que elegir una.
4. La siguiente tarjeta es la que más reduce la duda sobre quién va adelante.
5. Cuando una candidatura pasa de 0.70 y le saca al menos 0.25 a la segunda, y ya hubo 5 tarjetas, se muestra otra propuesta suya. Si no convence, el recorrido sigue. El tope es 12 tarjetas.
6. El resultado ordena a las candidaturas de esa boleta con un porcentaje, dice en cuántas propuestas hubo coincidencia y avisa si el texto es poco concreto o promete algo que ese cargo no hace. Si la diferencia entre las dos primeras es menor a 0.10, se dice que hay empate.

`GET /api/v1/candidatos/boleta?entidad=Jalisco&distrito=10&cargo=DIPUTACION_MR` entrega esa boleta. No incluye correo, teléfono, redes ni página web.

## 4. Medición

`python3 backend/scripts/etiquetado/simular_match.py`, en las 281 boletas de diputación de mayoría con al menos dos candidaturas con propuestas (798 casos, 15 % de respuestas al azar):

| Métrica | Resultado |
| :--- | :--- |
| La primera es la candidatura verdadera | 95.0 % |
| Queda entre las dos primeras | 99.5 % |
| Tarjetas promedio | 5.7 |

## 5. Decider en la RTX 3060 Ti

El servidor vive fuera del repositorio, en `~/Proyectos/Aurelio/decider/`. Python 3.12, `decider-ai[serve]`, pesos en `models/decider-2b`.

En 8 GB no cabe precompilar los CUDA graphs junto con las propuestas largas: el servidor responde HTTP 500. `serve.sh` arranca sin esa precompilación.

```bash
~/Proyectos/Aurelio/decider/serve.sh
# GET http://127.0.0.1:8000/v1/models  →  decider-2b-v11
```

El lote de la versión 3 tardó unos 67 minutos con dos solicitudes a la vez, a 0.79 segundos por texto.
