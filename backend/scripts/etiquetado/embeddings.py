#!/usr/bin/env python3
"""Similitud de propuestas dentro de cada boleta, con un modelo multilingüe en CPU.

No usa la GPU: Decider puede seguir etiquetando al mismo tiempo.
Escribe db/similitud.db con pares (a, b, similitud), a < b.
"""

import os
import sqlite3

os.environ["CUDA_VISIBLE_DEVICES"] = ""

import torch
from transformers import AutoModel, AutoTokenizer

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
DB = os.path.join(ROOT, "db/matchcivico.db")
SALIDA = os.path.join(ROOT, "db/similitud.db")
MODELO = "intfloat/multilingual-e5-base"


def boletas(conn):
    filas = conn.execute("""
        SELECT id_anonimo, entidad, distrito_id, cargo,
               propuesta_1_corta, propuesta_2_corta, propuesta_genero_corta
        FROM candidatos_candidatos
        WHERE tipo_candidato = 'Persona Propietaria'
          AND cargo IN ('DIPUTACIÓN FEDERAL MR', 'SENADURÍA FEDERAL MR', 'PRESIDENCIA DE LA REPÚBLICA')
    """).fetchall()
    grupos = {}
    for cid, entidad, distrito, cargo, p1, p2, genero in filas:
        if cargo == "DIPUTACIÓN FEDERAL MR":
            clave = (cargo, entidad, distrito)
        elif cargo == "SENADURÍA FEDERAL MR":
            clave = (cargo, entidad, 0)
        else:
            clave = (cargo, "", 0)
        for numero, texto in ((1, p1), (2, p2), (3, genero)):
            texto = (texto or "").strip()
            if texto:
                grupos.setdefault(clave, []).append((f"{cid}-{numero}", "passage: " + texto))
    return grupos


def vectores(tokenizer, modelo, textos):
    salida = []
    for inicio in range(0, len(textos), 16):
        lote = textos[inicio:inicio + 16]
        tokens = tokenizer(lote, padding=True, truncation=True, max_length=256, return_tensors="pt")
        with torch.no_grad():
            oculto = modelo(**tokens).last_hidden_state
        mascara = tokens["attention_mask"].unsqueeze(-1)
        prom = (oculto * mascara).sum(1) / mascara.sum(1).clamp(min=1)
        prom = torch.nn.functional.normalize(prom, dim=1)
        salida.append(prom)
        print(f"  embeddings {min(inicio + 16, len(textos))}/{len(textos)}", flush=True)
    return torch.cat(salida, dim=0)


def main():
    print("cargando", MODELO, flush=True)
    tokenizer = AutoTokenizer.from_pretrained(MODELO)
    modelo = AutoModel.from_pretrained(MODELO)
    modelo.eval()
    grupos = boletas(sqlite3.connect(DB))
    planos = [texto for grupo in grupos.values() for _, texto in grupo]
    ids = [identificador for grupo in grupos.values() for identificador, _ in grupo]
    print(f"{len(planos)} textos en {len(grupos)} boletas", flush=True)
    matriz = vectores(tokenizer, modelo, planos)
    indice = {identificador: posicion for posicion, identificador in enumerate(ids)}

    if os.path.exists(SALIDA):
        os.remove(SALIDA)
    salida = sqlite3.connect(SALIDA)
    salida.execute("CREATE TABLE pares (a TEXT NOT NULL, b TEXT NOT NULL, similitud REAL NOT NULL, PRIMARY KEY (a, b))")
    filas = []
    for grupo in grupos.values():
        identificadores = [identificador for identificador, _ in grupo]
        for i, a in enumerate(identificadores):
            for b in identificadores[i + 1:]:
                valor = float(torch.dot(matriz[indice[a]], matriz[indice[b]]))
                primero, segundo = sorted((a, b))
                filas.append((primero, segundo, round(valor, 4)))
    salida.executemany("INSERT INTO pares (a, b, similitud) VALUES (?, ?, ?)", filas)
    salida.commit()
    print(f"{len(filas)} pares en {SALIDA}", flush=True)


if __name__ == "__main__":
    main()
