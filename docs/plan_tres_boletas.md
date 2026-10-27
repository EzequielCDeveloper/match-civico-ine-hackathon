# Plan: las tres boletas en un solo resultado

Estado: implementado. Módulo: candidatos (Luis).

Hoy, después del distrito, `BoletaStep` pide elegir una sola boleta (diputación, senado o presidencia) y el resumen muestra solo esa. El cambio es quitar esa pregunta y, al final, mostrar juntas a la persona de diputación, la de senado y la de presidencia.

## Qué no cambia

Cada tarjeta sigue comparando candidaturas de **una** boleta. Diputación de mayoría son unas 3 personas del distrito, senado unas 6 del estado y presidencia 3. Si se vuelven a mezclar, el resultado deja de apuntar a alguien concreto: en Jalisco serían otra vez 62 nombres de distritos distintos.

El motor (`motor.ts` / `motor.py`), las etiquetas y `GET /api/v1/candidatos/boleta` se quedan. El teléfono llama ese endpoint tres veces, con el mismo estado y distrito:

| Llamada | `cargo` | A quién incluye |
| :--- | :--- | :--- |
| 1 | `DIPUTACION_MR` | Propietarias de ese distrito |
| 2 | `SENADO_MR` | Propietarias del estado. El distrito no filtra |
| 3 | `PRESIDENCIA` | Las tres candidaturas. Estado y distrito no filtran |

Las prioridades (hasta 3 temas) se eligen una vez y valen para las tres boletas.

## Recorrido

Se quita el paso `candidatos.boleta`. El orden queda: distrito, prioridades, tarjetas, resultado.

1. **Distrito.** Igual que ahora.
2. **Prioridades.** Igual que ahora.
3. **Tarjetas, en tres bloques seguidos.** Primero diputación, luego senado, luego presidencia. Cada bloque usa su propia creencia y se detiene con la regla actual (mínimo 5 tarjetas, máximo 12, confirmación con la otra propuesta). La tarjeta dice el cargo —"Diputación", "Senado" o "Presidencia"— y no dice nombre ni partido. Sin esa palabra, una propuesta de salud podría ser de cualquiera de las tres boletas.
4. **Si una boleta no se puede comparar** (menos de dos candidaturas con propuestas), ese bloque no tiene tarjetas. En el resultado se dice, por ejemplo, "En tu distrito solo una candidatura registró propuestas", y se muestra su nombre ahí, no en una tarjeta a ciegas.
5. **Un solo resultado.** Tres bloques, uno por cargo. Cada bloque muestra a quien quedó arriba: nombre, partido, porcentaje y la razón ("coincidiste con 4 y rechazaste 1"). Si hay empate en esa boleta, se dicen los dos nombres y no se inventa un ganador. Debajo, en una línea, "También en esta boleta" con el resto, sin abrir las propuestas de todas. Quien no registró propuestas sigue en una lista corta dentro de su bloque.

No hay botón de "seguir con la siguiente boleta". Al cerrar presidencia se pasa directo al resultado.

La tarjeta se arrastra en cuatro direcciones: derecha me convence (o la primera), izquierda no me convence (o la segunda), arriba o abajo me da igual. Los botones de abajo hacen lo mismo. El texto de la tarjeta no se selecciona, para que el arrastre no se lo quede el navegador.

## Datos que guarda el flujo

`candidatos.eleccion` deja de tener `cargo`. Guarda estado, id de estado, distrito y nombre del distrito.

`candidatos.resultado` pasa de un resultado a tres:

```ts
{
  diputacion: Resultado;
  senado: Resultado;
  presidencia: Resultado;
}
```

`Resultado` es el de ahora: `empate`, `filas`, `sinPropuestas`. El `cargo` de cada uno lo pone el bloque, no hace falta pedirlo.

## Archivos

| Archivo | Cambio |
| :--- | :--- |
| `steps/BoletaStep.tsx` | Se deja de usar. Se borra del arreglo en `steps.ts`. |
| `steps/CandidatosSwipeStep.tsx` | Carga las tres boletas al entrar. Lleva un índice de bloque (0, 1, 2) y, al cerrar uno, abre el motor del siguiente. |
| `steps/CandidatosResumenStep.tsx` | Tres secciones en lugar de una lista. |
| `steps/DistritoStep.tsx` | Al elegir distrito ya no hace falta pasar por la boleta; el `next()` sigue cayendo en prioridades. |

El backend no cambia. El simulador tampoco: sigue midiendo boleta por boleta, que es lo correcto.

## Orden

1. Quitar el paso de la boleta y cargar las tres respuestas del API en el swipe.
2. Encadenar los tres motores, con el nombre del cargo en la tarjeta.
3. Cambiar el resultado a tres bloques y probar en el navegador: Jalisco, distrito 10, y comprobar que al final hay un nombre de diputación, uno de senado y uno de presidencia.
