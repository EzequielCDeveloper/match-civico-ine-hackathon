# Etiquetado de propuestas y árbol de decisión — Módulo Candidatos (Luis)

Cómo se decide qué candidatos le sirven a un usuario: las propuestas se etiquetan **una sola vez**, fuera de la app, y el teléfono arma el recorrido con esas etiquetas. Las respuestas del usuario no salen del dispositivo.

---

## 1. Por qué etiquetas y no un árbol entrenado

Un árbol de decisión de machine learning aprende de ejemplos del tipo "este usuario eligió X y su candidato ideal fue Y". Esos ejemplos no existen. Lo que sí existe son 1,710 candidaturas propietarias con texto libre en `propuesta_1` y `propuesta_2`.

El recorrido se parece más a Akinator que a un modelo entrenado:

1. El usuario solo ve a los candidatos de su cargo y su distrito o entidad.
2. En cada paso se muestra, a ciegas, la etiqueta que mejor parte en dos a los que siguen en juego.
3. Deslizar a la derecha suma el peso de esa etiqueta; a la izquierda lo resta.
4. Se detiene cuando un candidato queda claramente arriba, normalmente en 5 a 7 preguntas.

Ese recorrido se calcula en el cliente. Todavía no está implementado en el frontend: esta entrega deja las etiquetas listas para usarlo.

---

## 2. Qué etiqueta cada propuesta

La lista cerrada vive en [`backend/scripts/etiquetado/taxonomia.json`](../backend/scripts/etiquetado/taxonomia.json) (versión 2). Son 28 preguntas del formato System One (`noul`, `choice`, `score`):

| Grupo | Cantidad | Qué mide |
| :--- | :--- | :--- |
| Ejes | 21 | Si la propuesta trata un tema: seguridad, salud, educación, empleo, ambiente, mujeres, juventud, infancia, adultos mayores, discapacidad, pueblos indígenas, campo, anticorrupción, derechos humanos, movilidad, vivienda, energía, tecnología, cultura y deporte, migración, bienestar animal. |
| Enfoques | 5 | Dentro de seguridad, salud, educación, economía y ambiente, cuál es el enfoque (por ejemplo castigo, prevención o más policía). |
| Transversales | 2 | Qué tan concreta es la propuesta, y si lo que promete lo puede hacer alguien en ese `cargo`. |

`propuesta_genero` no se etiqueta. El INE se la pide a casi todas las candidaturas, así que marcaría el eje de mujeres en casi todo el padrón.

Los temas salieron de contar palabras en las propuestas reales. Economía aparece en cerca del 66 % de los textos, seguridad en el 44 % y salud en el 43 %. Migración y bienestar animal son poco frecuentes, pero importan mucho a quien los busca.

---

## 3. Cómo se convierte la respuesta del modelo en un peso

Todo queda entre 0 y 1 en `candidatos_etiquetas`. No hay umbral de "sí o no": un 0.45 suma menos que un 0.92.

| Etiqueta | Peso |
| :--- | :--- |
| `eje_<tema>` | Probabilidad de que la propuesta trate ese tema. |
| `enfoque_<eje>.<opcion>` | Probabilidad de esa opción **multiplicada por la probabilidad de su eje**. Si el candidato no habla de seguridad, sus enfoques de seguridad quedan cerca de 0. La opción `no_aplica` no se guarda. |
| `concrecion` | Nivel de la escala de 3, dividido entre 2. |
| `competencia_cargo` | Probabilidad de que la propuesta corresponda a lo que ese cargo puede hacer. |

Un diputado o senador legisla, presupuesta y fiscaliza. Prometer construir un hospital baja `competencia_cargo`.

---

## 4. Tabla `candidatos_etiquetas`

Definida en `db/schema.sql`, en la sección del módulo candidatos. `init_sqlite.py` no la llena.

| Columna | Tipo | Descripción |
| :--- | :--- | :--- |
| `id_anonimo` | `INTEGER` | Candidato. Junto con `etiqueta` forma la llave primaria. |
| `etiqueta` | `TEXT` | `eje_*`, `enfoque_*.*`, `concrecion` o `competencia_cargo`. |
| `peso` | `REAL` | De 0 a 1, con 4 decimales. |

Estado actual: **1,710 candidatos** propietarios con al menos una propuesta, **44 etiquetas** cada uno (21 ejes, 21 enfoques y 2 transversales), **75,240 filas**. Las dos copias de la base (`db/` y `backend/data/`) están sincronizadas.

Los 1,395 registros sin propuestas, y todos los suplentes, no tienen filas. La app debe decirlo ("no registró propuestas"), no tratarlos como puntaje cero.

---

## 5. El modelo: Decider, en local

[Decider](https://github.com/Mapika/decider) (Mapika, Apache-2.0) es un modelo abierto del mismo tipo que Jev, de TypeSafe: no escribe texto. Recibe un estado y preguntas cerradas, y devuelve una probabilidad por opción. El checkpoint usado es **`Mapika/decider-2b` v11** (Qwen3.5-2B, unos 4 GB en bf16). Habla el mismo `POST /v1/systemone` que Jev y que Mercury Decide, así que cambiar de modelo es cambiar la URL.

Se eligió Decider porque corre en una RTX 3060 Ti de 8 GB, no tiene cuota diaria y las propuestas no salen de la máquina. Mercury Decide gratis en OpenRouter (`inception/mercury-decide:free`) queda como comparación: 50 solicitudes al día sin créditos, o 1,000 si alguna vez se compraron 10 dólares.

### 5.1. Instalación

Fuera del repositorio, con Python 3.12 (el del sistema puede ser más nuevo y PyTorch no instala igual):

```bash
mkdir -p ~/Proyectos/Aurelio/decider && cd ~/Proyectos/Aurelio/decider
uv venv --python 3.12 .venv
uv pip install -p .venv/bin/python "decider-ai[serve]"
.venv/bin/python -c "from huggingface_hub import snapshot_download; snapshot_download('Mapika/decider-2b', local_dir='models/decider-2b')"
```

Opcional, y solo si hay CUDA toolkit (`nvcc`): el kernel `causal-conv1d` para la arquitectura de la tarjeta. En esta 3060 Ti (sm_86) mejoró la velocidad un 7 %, de 1.11 a 1.05 segundos por candidato.

```bash
export CUDA_HOME=/opt/cuda PATH=/opt/cuda/bin:$PATH TORCH_CUDA_ARCH_LIST=8.6
export CAUSAL_CONV1D_FORCE_BUILD=TRUE MAX_JOBS=8
uv pip install -p .venv/bin/python ninja
uv pip install -p .venv/bin/python causal-conv1d --no-build-isolation --no-cache
```

### 5.2. Servidor

En 8 GB, precompilar los CUDA graphs se come la memoria que necesitan las propuestas largas (cerca de 3,000 caracteres) y el servidor responde HTTP 500. Sin esa precompilación el lote completo cabe y la velocidad es la misma, cerca de **1.6 segundos por candidato** con las 28 preguntas. Unas 4 en paralelo.

```bash
cd ~/Proyectos/Aurelio/decider
export DECIDER_MODEL=$PWD/models/decider-2b
export DECIDER_WARMUP=0 DECIDER_GRAPH_TOKEN_BUDGET=4096
export DECIDER_MAX_BATCH=8 DECIDER_MAX_STATE_TOKENS=4096
export PYTORCH_CUDA_ALLOC_CONF=expandable_segments:True
.venv/bin/uvicorn decider.serve:app --host 127.0.0.1 --port 8000
```

`GET http://127.0.0.1:8000/v1/models` debe responder `decider-2b-v11`.

---

## 6. Correr el etiquetado

[`backend/scripts/etiquetado/etiquetar.py`](../backend/scripts/etiquetado/etiquetar.py) no instala dependencias: solo usa la biblioteca estándar.

```bash
# Decider local. Retoma solo lo que falte.
python3 backend/scripts/etiquetado/etiquetar.py

# Prueba corta
python3 backend/scripts/etiquetado/etiquetar.py --limit 5

# El mismo script contra OpenRouter (Mercury, Jev, Clef...)
ETIQUETADO_API_KEY=... python3 backend/scripts/etiquetado/etiquetar.py \
  --url https://openrouter.ai/api/v1/systemone \
  --model inception/mercury-decide --workers 1
```

Guarda cada respuesta en `backend/data/candidatos_etiquetas_raw.jsonl` y, al terminar, rellena `candidatos_etiquetas` en las dos bases. Si Decider se cae a la mitad, volver a correr el script continúa donde se quedó.

`init_sqlite.py` **borra** `db/matchcivico.db` y la copia. Después de resembrar, correr `etiquetar.py` otra vez: si el JSONL ya tiene todas las respuestas de esta versión de la taxonomía, solo recarga la tabla y no usa la GPU.

Si cambian las **preguntas**, hay que subir `version` en `taxonomia.json` y volver a etiquetar. Si solo cambia la **fórmula de los pesos** dentro de `etiquetar.py`, correr el script recarga la tabla desde el JSONL.

---

## 7. Lo que falta

El árbol en la app. Falta un endpoint en `internal/candidatos` que entregue los candidatos del distrito con sus etiquetas, y la elección de la siguiente tarjeta en `frontend/src/features/candidatos`. La siguiente etiqueta es la que más cerca parte a la mitad a los candidatos que siguen en juego:

```text
siguiente = argmax  p * (1 - p)     donde p = fracción de candidatos vivos que tienen la etiqueta
```

Un candidato sigue vivo mientras su puntaje acumulado no haya caído por debajo de los demás.
