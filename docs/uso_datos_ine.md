# Uso de los datos del INE — Match Cívico

Qué archivos del INE entran al proyecto, qué columnas se conservan, cómo se agregan y qué fórmula produce los porcentajes que ve la aplicación. El procesamiento está en [`backend/preparar_datos.py`](../backend/preparar_datos.py) y la carga a SQLite en [`backend/scripts/init_sqlite.py`](../backend/scripts/init_sqlite.py).

La convocatoria [Hackea la participación 2026](https://ine.mx/wp-content/uploads/2026/09/Convocatoria_Hackaton-1.pdf) pide usar la Plataforma de Conteos Censales de Participación Ciudadana (CCPC) 2009–2024, con datos agregados y sin datos personales. Este repositorio usa solo el corte 2024 de esos conteos, y además el padrón público de candidaturas de Conóceles. La sección 7 dice qué parte de la convocatoria cubre cada fuente.

---

## 1. Dos fuentes, dos preguntas

| Fuente | Archivo de origen | Qué responde en la app |
| :--- | :--- | :--- |
| Conteos Censales de Participación Ciudadana 2024, DECEyEC | `DatosAbiertos_DECEyEC_ConteosCensales2024/*.csv`, o el `.zip` del mismo nombre | En el estado y el distrito del usuario, qué porcentaje de la lista nominal votó en 2024, y qué porcentaje votó entre quienes tenían 18 a 29 años. |
| Sistema Conóceles, candidaturas federales 2024 | `baseDatosCandidatos.xls` | Quiénes competían en ese distrito o entidad, qué propusieron y qué trayectoria registraron. |

Los conteos salen de los cuadernillos de la lista nominal de las casillas: cada registro se marcó como sí votó, no votó o no especificado. No incluyen casillas especiales, voto en el extranjero ni casillas no instaladas. La serie publicada cubre 2009, 2012, 2015, 2018, 2021 y 2024 ([plataforma](https://www.ine.mx/transparencia/datos-abiertos/visualizacion-datos/conteos-censales-participacion/), [manual 2009–2024](https://ine.mx/wp-content/uploads/2025/06/Manual-Conteos-Censales-2009-2024.pdf)). Aquí solo entra 2024.

Conóceles es el registro público de candidaturas. Cada fila es una persona candidata, propietaria o suplente, con su cargo, distrito, escolaridad y los textos que ella misma capturó.

Los archivos crudos viven en `backend/Datos/` y no se versionan (`.gitignore` excluye `backend/Datos/*`). Lo que sí está en el repositorio son los tres JSON ya procesados, en `backend/data/`, y las dos copias de `matchcivico.db`.

---

## 2. Recorrido

```text
backend/Datos/baseDatosCandidatos.xls
backend/Datos/DatosAbiertos_DECEyEC_ConteosCensales2024/*.csv
        │
        ▼
backend/preparar_datos.py          (desde backend/; --force regenera)
        │
        ├─ backend/data/candidatos_limpios.json
        ├─ backend/data/participacion_distritos.json
        └─ backend/data/datos_unificados.json     (los dos anteriores, más metadata)
        │
        ▼
backend/scripts/init_sqlite.py     (desde la raíz del repo; borra la base y la vuelve a crear)
        │
        ├─ db/matchcivico.db
        └─ backend/data/matchcivico.db            (copia de la anterior)
```

`preparar_datos.py` no hace nada si `datos_unificados.json` ya existe, salvo que se llame con `--force`. Busca el Excel y los CSV primero en el directorio de trabajo y después en `Datos/`.

`init_sqlite.py` no vuelve a leer el Excel ni los CSV. Solo lee `datos_unificados.json` y `db/schema.sql`. Por eso un cambio en la fórmula de participación no llega a la aplicación hasta regenerar el JSON y después la base.

Después de la siembra, `etiquetar.py` y `embeddings.py` agregan columnas y tablas que **no vienen del INE**: extractos legibles, etiquetas por propuesta y similitud entre textos. El detalle está en [`etiquetado_candidatos.md`](etiquetado_candidatos.md).

---

## 3. Candidaturas (Conóceles)

El Excel trae 4,584 filas. El script conserva una fila por candidatura y no descarta suplentes ni registros sin propuesta. `id_anonimo` es el orden de la fila en el archivo, de 1 a 4,584. No es un identificador publicado por el INE.

### 3.1. Columnas que se copian

Se leen tal cual, después de `limpiar_campo` (nulos, `nan`, `none` y `null` pasan a cadena vacía):

`PARTIDO_COALICION`, `CARGO`, `CIRCUNSCRIPCION`, `MUNICIPIO`, `NUM_LISTA_O_FORMULA`, `NOMBRE_CANDIDATO`, `TIPO_CANDIDATO`, `ESTATUS`, `SEXO`, `ESCOLARIDAD`, `ESTATUS_ESCOLARIDAD`, `CURSOS`, `HISTORIA_PROFESIONAL`, `TRAYECTORIA_POLITICA`, `MOTIVO_CARGO_PUBLICO`, `PROPUESTA_1`, `PROPUESTA_2`, `PROPUESTA_GENERO`, `REDES`, `PAGINA_WEB`, `CORREO_ELECTRONICO`, `TELEFONO`.

`EDAD` se guarda como entero. Si no se puede leer, queda en 0.

Nombre, correo, teléfono, redes y página web se guardan en la base como vienen en Conóceles. `GET /api/v1/candidatos` no los devuelve: la respuesta trae propuestas, trayectoria y, para el cierre, nombre y partido.

### 3.2. Campos que se calculan

| Campo | Regla |
| :--- | :--- |
| `entidad` | `ENTIDAD` en mayúsculas, sin acentos y con espacios colapsados. Así se puede cruzar con el nombre de entidad de los conteos. |
| `distrito_federal` | Texto original de `DISTRITO_FEDERAL`, por ejemplo `2-MEXICALI`. |
| `distrito_id`, `distrito_nombre` | Si el texto es `N-NOMBRE`, se separan el número y el nombre. `No aplica`, vacío o no numérico dejan `distrito_id` en 0. Presidencia, representación proporcional nacional y varios registros de senaduría caen en 0. |
| `tiene_propuestas` | Verdadero si `PROPUESTA_1`, `PROPUESTA_2` o `PROPUESTA_GENERO` tiene texto distinto de vacío, `sin captura`, `sin dato` o `no aplica`. |
| `tiene_titulo` | Solo al pasar a SQLite. Vale 1 si `estatus_escolaridad`, ya sin distinguir mayúsculas, es `título`, `titulo`, `cédula profesional` o `cedula profesional`. |
| `estudios` | Solo en SQLite. Concatena escolaridad y estatus, por ejemplo `Licenciatura (Título)`. |
| `propuesta_1_corta`, `propuesta_2_corta`, `propuesta_genero_corta` | Solo en SQLite, las llena `etiquetar.py`. El texto del INE, con las mayúsculas sostenidas bajadas y cortado en la última oración antes de 500 caracteres. Es lo que ve la persona en las tarjetas. |

El texto original de Conóceles no se borra. El tono sigue en `propuesta_1`, `propuesta_2` y `propuesta_genero`. La comparación a ciegas usa el extracto y no muestra nombre ni partido hasta el resultado.

### 3.3. Cifras de control

| Cargo | Registros | Propietarios | Con `tiene_propuestas` |
| :--- | ---: | ---: | ---: |
| Diputación federal MR | 1,980 | 992 | 1,516 |
| Diputación federal RP | 1,772 | 887 | 1,007 |
| Senaduría federal MR | 495 | 247 | 417 |
| Senaduría federal RP | 334 | 168 | 247 |
| Presidencia | 3 | 3 | 3 |
| **Total** | **4,584** | **2,297** | **3,190** |

De las 2,297 personas propietarias, 586 no tienen ninguna propuesta utilizable. Esas candidaturas siguen en la base. De los estatus de escolaridad, 1,743 quedan con título y 578 con cédula; el resto (vacío, cursando, certificado, trunco) tiene `tiene_titulo = 0`.

---

## 4. Conteos censales 2024

Cada CSV es una entidad. De cada archivo solo se leen nueve columnas:

| Columna | Significado en la fuente | Dónde queda |
| :--- | :--- | :--- |
| `EDOCVE` | Clave de entidad | `entidad_id` |
| `EDONOM` | Nombre de la entidad | `entidad`, normalizado igual que en candidaturas |
| `DEF` | Distrito electoral federal | `distrito_id` |
| `SEXO` | Código de sexo | Solo en el desglose joven por distrito |
| `EDAD` | Edad en años | Sirve para filtrar 18 a 29; no se guarda la edad |
| `LN` | Lista nominal | `lista_nominal` |
| `SV` | Sí votó | `votos_totales` |
| `NV` | No votó | `no_votaron` |
| `NS` | No especificado | `no_especificado` |

Una fila del CSV no es una persona. Es un conteo de una celda (sección, sexo, edad y demás cortes que traiga el archivo). El script suma esas celdas.

Se tiran las filas con `DEF` menor o igual a 0. Los totales de entidad son la suma de sus distritos federales, no un total estatal aparte. En la base cargada, para las 32 entidades y los 300 distritos se cumple `LN = SV + NV + NS` sin residuo.

Columnas que el CSV trae y este proceso no usa: sección, municipio, distrito local, tipo de sección (urbana, rural o mixta), referente indígena y afrodescendencia. Esas dimensiones existen en la plataforma y no están en `matchcivico.db`. Tampoco entran los años anteriores a 2024.

### 4.1. Agregación

1. Se suman `LN`, `SV`, `NV` y `NS` de todas las filas con `DEF > 0`. Eso es el total de la entidad.
2. El grupo joven es el subconjunto con `EDAD` entre 18 y 29, inclusive, y se suma igual. No es el promedio de los porcentajes por edad.
3. Lo mismo se repite por `DEF` para los 300 distritos.
4. El desglose por sexo solo se calcula para ese grupo joven y solo a nivel distrito. El script traduce el código así: `0` hombres, `1` mujeres, `2` no binario. Guarda lista nominal, sí votaron y los dos porcentajes. En SQLite ese objeto va en `desglose_sexo_joven_json`.

El nombre del distrito no viene del censo. Se toma del Excel de Conóceles: la primera vez que aparece la pareja (entidad normalizada, `distrito_id`) con un nombre parseado de `DISTRITO_FEDERAL`. Si no hubiera cruce, el nombre sería `DISTRITO {id}`. En la base actual los 300 distritos tienen nombre de cabecera; ninguno quedó con ese respaldo.

### 4.2. Fórmula que usa el código

Para entidad, distrito, grupo joven y cada sexo del desglose:

```text
participación = SV / LN × 100          si LN > 0; si no, 0
abstencionismo = 100 − participación
brecha = abstencionismo joven − abstencionismo general
```

Los porcentajes se redondean a dos decimales. La brecha también. Una brecha positiva significa que, en ese corte, el grupo de 18 a 29 se abstuvo más que el conjunto de la lista nominal.

Esta fórmula mete a `NS` en el denominador y, por tanto, dentro de la abstención. El manual de los conteos censales define otra cosa: la participación es `SV / (LN − NS)` y la abstención es `NV / (LN − NS)`. Los no especificados salen de ambos porcentajes ([manual DECEyEC](https://www.ine.mx/wp-content/uploads/2019/12/DECEyEC-manualConteosCensales.pdf)).

Con los totales nacionales ya cargados la diferencia se ve así:

| | LN | SV | NV | NS |
| :--- | ---: | ---: | ---: | ---: |
| Suma de las 32 entidades | 98,330,348 | 54,899,228 | 37,105,466 | 6,325,654 |

| Fórmula | Participación | Abstención |
| :--- | ---: | ---: |
| La de este repositorio, `SV / LN` | 55.83 % | 44.17 % |
| La del manual, `SV / (LN − NS)` y `NV / (LN − NS)` | 59.67 % | 40.33 % |

Ciudad de México queda en la base con 67.98 % de participación general y 59.79 % joven (brecha de abstención de 8.19 puntos). Estado de México queda en 61.10 % y 51.38 % (brecha de 9.72). Esas cifras son las del código, no las del tablero oficial.

---

## 5. Qué llega a cada tabla

`datos_unificados.json` trae `metadata`, `entidades` (cada una con su arreglo `distritos`) y `candidatos`.

| Tabla | Origen | Qué no copia del JSON |
| :--- | :--- | :--- |
| `candidatos_candidatos` | Cada candidatura | Añade `tiene_titulo`, `estudios` y los tres extractos `propuesta_*_corta`. |
| `votantes_entidades` | Cada entidad, sin el arreglo de distritos | — |
| `votantes_distritos` | Cada distrito | El desglose por sexo se guarda como texto JSON. La app de candidatos usa `distrito_id` y `distrito_nombre` para armar la boleta del distrito. |
| `votantes_perfiles` | Vacía al sembrar | La llena la app cuando alguien calcula su perfil. |
| `candidatos_etiquetas` | Vacía al sembrar | Etiquetas viejas, por candidato, de la taxonomía v2. El match nuevo no las lee. |
| `candidatos_propuesta_etiquetas` | No está en el JSON | Una fila por texto (`propuesta` 1, 2 o 3) y por etiqueta. La llena `etiquetar.py`. |
| `db/similitud.db` | No está en el JSON | Pares de propuestas de la misma boleta. Lo escribe `embeddings.py`. No es un dato del INE. |
| `sistema_resets`, `sistema_exportaciones` | Una fila de siembra en resets | No vienen del INE. |

---

## 6. Qué no se hizo

- No se usó la serie 2009–2021, así que no hay comparación entre elecciones ni tendencia.
- No se usó sección, municipio, distrito local, tipo de sección ni referente indígena o afromexicano de los conteos.
- No se aplicó la fórmula oficial que excluye a `NS`.
- No se cruzó la participación del distrito con la candidatura dentro de una tabla. Comparten `entidad` y `distrito_id`. La app pide los distritos a `GET /api/v1/votantes/entidades/{id}` y las candidaturas a `GET /api/v1/candidatos/boleta`.
- No se descartó a suplentes ni a quien no escribió propuestas. Quien no tiene texto usable aparece en el resultado bajo "No registraron propuestas".
- El texto original de Conóceles se conserva. El extracto corto solo normaliza mayúsculas y recorta. No reescribe el contenido.

---

## 7. Cómo se lee esto frente a la convocatoria

El criterio de evaluación pide aprovechar los datos de la Plataforma CCPC. De esa plataforma, el proyecto usa el corte 2024, agregado a entidad y a distrito federal, con el corte de edad 18 a 29 y el desglose joven por sexo. No usa el historial de elecciones ni el resto de cortes geográficos.

Conóceles no forma parte de la Plataforma CCPC. Entra porque el comparador necesita las propuestas y la trayectoria. Ese archivo sí trae datos de personas publicados por el propio sistema: nombre, correo, teléfono, redes y página web. La convocatoria pide trabajar los conteos sin datos personales. Esa restricción se cumple en `votantes_entidades` y `votantes_distritos`. En candidaturas, el correo, el teléfono, las redes y la página web se guardan y no salen en `GET /api/v1/candidatos` ni en `GET /api/v1/candidatos/boleta`. El nombre y el partido solo se muestran al final, cuando el recorrido ya terminó.
