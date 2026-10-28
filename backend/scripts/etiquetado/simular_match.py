#!/usr/bin/env python3
"""Mide cuántas veces el motor recupera a la candidatura verdadera en diputación de mayoría."""

import os
import random
import sqlite3
import sys

sys.path.insert(0, os.path.dirname(__file__))
from motor import MAX_TARJETAS, afinidad, ordenadas, responder, siguiente  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DB = os.path.join(ROOT, "db/matchcivico.db")
SIM = os.path.join(ROOT, "db/similitud.db")
RUIDO = 0.15


def cargar():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    personas = conn.execute("""
        SELECT id_anonimo, entidad, distrito_id, cargo,
               propuesta_1_corta, propuesta_2_corta, propuesta_genero_corta
        FROM candidatos_candidatos
        WHERE tipo_candidato = 'Persona Propietaria'
          AND cargo = 'DIPUTACIÓN FEDERAL MR'
    """).fetchall()
    etiquetas = {}
    try:
        for cid, numero, etiqueta, peso in conn.execute(
            "SELECT id_anonimo, propuesta, etiqueta, peso FROM candidatos_propuesta_etiquetas"
        ):
            etiquetas.setdefault((cid, numero), {})[etiqueta] = peso
    except sqlite3.OperationalError:
        pass
    conn.close()
    embeddings = {}
    if os.path.exists(SIM):
        sim = sqlite3.connect(SIM)
        for a, b, valor in sim.execute("SELECT a, b, similitud FROM pares"):
            embeddings[tuple(sorted((a, b)))] = valor
        sim.close()
    return personas, etiquetas, embeddings


def boletas(personas, etiquetas):
    grupos = {}
    for persona in personas:
        grupos.setdefault((persona["entidad"], persona["distrito_id"]), []).append(persona)
    salida = []
    for grupo in grupos.values():
        propuestas = []
        for persona in grupo:
            for numero, columna in ((1, "propuesta_1_corta"), (2, "propuesta_2_corta"), (3, "propuesta_genero_corta")):
                texto = (persona[columna] or "").strip()
                tags = etiquetas.get((persona["id_anonimo"], numero))
                if texto and tags:
                    propuestas.append({
                        "id": f"{persona['id_anonimo']}-{numero}",
                        "candidato": persona["id_anonimo"],
                        "texto": texto,
                        "etiquetas": tags,
                    })
        ids = {p["candidato"] for p in propuestas}
        if len(ids) >= 2:
            salida.append(propuestas)
    return salida


def responder_como(verdadera, tarjeta, propuestas_de, embeddings, azar):
    if azar.random() < RUIDO:
        return azar.choice(("si", "no", "igual"))
    if tarjeta["tipo"] == "dilema":
        hacia_a = afinidad(verdadera, tarjeta["a"], propuestas_de, embeddings)
        hacia_b = afinidad(verdadera, tarjeta["b"], propuestas_de, embeddings)
        if abs(hacia_a - hacia_b) < 0.15:
            return "igual"
        return "si" if hacia_a > hacia_b else "no"
    afin = afinidad(verdadera, tarjeta["propuesta"], propuestas_de, embeddings)
    if afin >= 0.6:
        return "si"
    if afin <= 0.4:
        return "no"
    return "igual"


def jugar(propuestas, verdadera, embeddings, azar):
    ids = sorted({p["candidato"] for p in propuestas})
    creencia = {c: 1 / len(ids) for c in ids}
    de = {}
    for propuesta in propuestas:
        de.setdefault(propuesta["candidato"], []).append(propuesta)
    mostradas = []
    ya_confirmo = False
    for _ in range(MAX_TARJETAS + 1):
        tarjeta = siguiente(creencia, propuestas, de, embeddings, mostradas, [], ya_confirmo)
        if tarjeta is None:
            break
        if tarjeta["tipo"] == "confirmacion":
            ya_confirmo = True
        respuesta = responder_como(verdadera, tarjeta, de, embeddings, azar)
        if tarjeta["tipo"] == "dilema":
            mostradas.extend([tarjeta["a"]["id"], tarjeta["b"]["id"]])
        else:
            mostradas.append(tarjeta["propuesta"]["id"])
        creencia = responder(creencia, tarjeta, respuesta, de, embeddings)
        if tarjeta["tipo"] == "confirmacion" and respuesta == "si":
            break
    ranking = ordenadas(creencia)
    return ranking[:2], len(mostradas)


def main():
    personas, etiquetas, embeddings = cargar()
    grupos = boletas(personas, etiquetas)
    azar = random.Random(2024)
    aciertos = entre_dos = tarjetas = casos = 0
    for propuestas in grupos:
        ids = sorted({p["candidato"] for p in propuestas})
        for verdadera in ids:
            ranking, usadas = jugar(propuestas, verdadera, embeddings, azar)
            casos += 1
            aciertos += ranking[0] == verdadera
            entre_dos += verdadera in ranking
            tarjetas += usadas
    print(f"boletas {len(grupos)}  casos {casos}")
    if not casos:
        print("Todavía no hay suficientes propuestas etiquetadas.")
        return
    print(f"primera correcta {aciertos / casos:.1%}")
    print(f"entre las dos primeras {entre_dos / casos:.1%}")
    print(f"tarjetas promedio {tarjetas / casos:.1f}")
    print(f"embeddings {'sí' if embeddings else 'no'}")


if __name__ == "__main__":
    main()
