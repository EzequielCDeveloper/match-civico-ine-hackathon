"""Motor bayesiano del match. Lo usa el simulador; el cliente repite estas cuentas."""

import math

EPS = 0.05
MIN_TARJETAS = 5
MAX_TARJETAS = 12
UMBRAL = 0.70
MARGEN = 0.25
EMPATE = 0.10
FACTOR_PRIORIDAD = 1.7


def _eje(etiquetas):
    ejes = {k: v for k, v in etiquetas.items() if k.startswith("eje_")}
    if ejes:
        eje = max(ejes, key=ejes.get)
        if ejes[eje] >= 0.35:
            return eje
    genero = {k: v for k, v in etiquetas.items() if k.startswith("enfoque_genero.")}
    if genero and max(genero.values()) >= 0.35:
        return "eje_mujeres"
    return ""


def _enfoque(etiquetas, eje):
    if eje == "eje_mujeres" and any(k.startswith("enfoque_genero.") for k in etiquetas):
        prefijo = "enfoque_genero."
    else:
        prefijo = "enfoque_" + eje.removeprefix("eje_") + "."
    opciones = {k: v for k, v in etiquetas.items() if k.startswith(prefijo)}
    if not opciones:
        return ""
    return max(opciones, key=opciones.get)


def similitud_etiquetas(a, b):
    eje_a, eje_b = _eje(a), _eje(b)
    if not eje_a or not eje_b or eje_a != eje_b:
        return 0.08
    foco_a, foco_b = _enfoque(a, eje_a), _enfoque(b, eje_b)
    if foco_a and foco_b and foco_a == foco_b:
        return 0.9
    if foco_a and foco_b:
        return 0.35
    return 0.6


def similitud_par(origen, destino, embeddings):
    """Qué tan parecida es la propuesta destino a la propuesta origen. 1 si son la misma."""
    if origen["id"] == destino["id"]:
        return 1.0
    por_etiqueta = similitud_etiquetas(origen["etiquetas"], destino["etiquetas"])
    clave = tuple(sorted((origen["id"], destino["id"])))
    por_texto = embeddings.get(clave)
    # El texto solo desempata cuando las etiquetas no alcanzan a separar.
    if por_texto is None or por_etiqueta >= 0.85 or por_etiqueta <= 0.12:
        return por_etiqueta
    return 0.75 * por_etiqueta + 0.25 * por_texto


def afinidad(candidatura, propuesta, propuestas_de, embeddings):
    return max(similitud_par(propuesta, otra, embeddings) for otra in propuestas_de[candidatura])


def verosimilitud(afinidad_c, respuesta):
    resto = 1 - 3 * EPS
    if respuesta == "igual":
        return EPS
    if respuesta == "si":
        return EPS + resto * afinidad_c
    return EPS + resto * (1 - afinidad_c)


def actualizar(creencia, afinidades, respuesta):
    pesos = {c: creencia[c] * verosimilitud(afinidades[c], respuesta) for c in creencia}
    total = sum(pesos.values()) or 1.0
    return {c: peso / total for c, peso in pesos.items()}


def entropia(creencia):
    return -sum(p * math.log(p) for p in creencia.values() if p > 0)


def ganancia(creencia, afinidades):
    """Cuánta incertidumbre quita preguntar esta tarjeta, en promedio."""
    actual = entropia(creencia)
    esperada = 0.0
    for respuesta in ("si", "no", "igual"):
        probabilidad = sum(creencia[c] * verosimilitud(afinidades[c], respuesta) for c in creencia)
        if probabilidad <= 0:
            continue
        posterior = actualizar(creencia, afinidades, respuesta)
        esperada += probabilidad * entropia(posterior)
    return actual - esperada


def ordenadas(creencia):
    return sorted(creencia, key=creencia.get, reverse=True)


def lider_claro(creencia, mostradas):
    if len(mostradas) < MIN_TARJETAS or len(creencia) < 2:
        return False
    primero, segundo = ordenadas(creencia)[:2]
    return creencia[primero] >= UMBRAL and creencia[primero] - creencia[segundo] >= MARGEN


def hay_empate(creencia):
    if len(creencia) < 2:
        return False
    primero, segundo = ordenadas(creencia)[:2]
    return creencia[primero] - creencia[segundo] < EMPATE


def siguiente(creencia, propuestas, propuestas_de, embeddings, mostradas, prioridades, ya_confirmo):
    """Devuelve la siguiente tarjeta, o None para cerrar.

    Una tarjeta es {"tipo": "una"|"dilema"|"confirmacion", ...}.
    """
    if len(creencia) < 2:
        return None
    if len(mostradas) >= MAX_TARJETAS:
        return None
    if lider_claro(creencia, mostradas) and not ya_confirmo:
        lider = ordenadas(creencia)[0]
        otras = [p for p in propuestas_de[lider] if p["id"] not in mostradas]
        if otras:
            return {"tipo": "confirmacion", "propuesta": otras[0]}
        return None

    visibles = [p for p in propuestas if p["id"] not in mostradas and _entra(p, prioridades)]
    if not visibles:
        return None

    def afinidades_de(propuesta):
        return {c: afinidad(c, propuesta, propuestas_de, embeddings) for c in creencia}

    mejor = None
    mejor_ganancia = -1.0
    for propuesta in visibles:
        gan = ganancia(creencia, afinidades_de(propuesta))
        if _eje(propuesta["etiquetas"]) in prioridades:
            gan *= FACTOR_PRIORIDAD
        if gan > mejor_ganancia:
            mejor_ganancia = gan
            mejor = {"tipo": "una", "propuesta": propuesta, "ganancia": gan}

    for i, primera in enumerate(visibles):
        eje = _eje(primera["etiquetas"])
        foco = _enfoque(primera["etiquetas"], eje) if eje else ""
        if not eje or not foco:
            continue
        for segunda in visibles[i + 1:]:
            if primera["candidato"] == segunda["candidato"]:
                continue
            if _eje(segunda["etiquetas"]) != eje:
                continue
            if _enfoque(segunda["etiquetas"], eje) == foco:
                continue
            # El dilema usa la fracción de afinidad hacia la primera propuesta.
            afinidades = {}
            for c in creencia:
                hacia_a = afinidad(c, primera, propuestas_de, embeddings)
                hacia_b = afinidad(c, segunda, propuestas_de, embeddings)
                afinidades[c] = hacia_a / (hacia_a + hacia_b) if hacia_a + hacia_b else 0.5
            gan = ganancia(creencia, afinidades)
            if eje in prioridades:
                gan *= FACTOR_PRIORIDAD
            if gan > mejor_ganancia:
                mejor_ganancia = gan
                mejor = {"tipo": "dilema", "a": primera, "b": segunda, "tema": eje, "ganancia": gan}
    return mejor


def _solo_genero(etiquetas):
    tiene_genero = any(k.startswith("enfoque_genero.") for k in etiquetas)
    tiene_eje = any(k.startswith("eje_") and v >= 0.35 for k, v in etiquetas.items())
    return tiene_genero and not tiene_eje


def _entra(propuesta, prioridades):
    # La propuesta de género solo entra si la persona marcó ese tema.
    if _solo_genero(propuesta["etiquetas"]):
        return "eje_mujeres" in prioridades
    return True


def responder(creencia, tarjeta, respuesta, propuestas_de, embeddings):
    """respuesta: si, no, igual. En un dilema, si = la primera y no = la segunda."""
    if tarjeta["tipo"] == "dilema":
        afinidades = {}
        for c in creencia:
            hacia_a = afinidad(c, tarjeta["a"], propuestas_de, embeddings)
            hacia_b = afinidad(c, tarjeta["b"], propuestas_de, embeddings)
            afinidades[c] = hacia_a / (hacia_a + hacia_b) if hacia_a + hacia_b else 0.5
        return actualizar(creencia, afinidades, respuesta)
    afinidades = {c: afinidad(c, tarjeta["propuesta"], propuestas_de, embeddings) for c in creencia}
    return actualizar(creencia, afinidades, respuesta)
