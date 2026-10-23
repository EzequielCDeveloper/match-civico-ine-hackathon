#!/usr/bin/env python3
"""
Etiqueta cada texto de propuesta por separado (propuesta_1, propuesta_2 y
propuesta_genero) con un modelo System One y llena candidatos_propuesta_etiquetas.
También guarda un extracto legible en propuesta_*_corta.

propuesta_genero no se clasifica en los 21 ejes: solo recibe enfoque_genero,
concreción y si corresponde al cargo.

Las respuestas crudas van a backend/data/candidatos_etiquetas_raw.jsonl.
Es reanudable: un texto ya guardado para esta versión de la taxonomía no se vuelve a pedir.

Uso:
  python3 backend/scripts/etiquetado/etiquetar.py
  python3 backend/scripts/etiquetado/etiquetar.py --limit 6
"""

import argparse
import json
import os
import re
import sqlite3
import sys
import time
import urllib.error
import urllib.request
from concurrent.futures import ThreadPoolExecutor, as_completed

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "../../.."))
TAXONOMIA = os.path.join(os.path.dirname(__file__), "taxonomia.json")
RAW_PATH = os.path.join(ROOT, "backend/data/candidatos_etiquetas_raw.jsonl")
DB_PATHS = [os.path.join(ROOT, "db/matchcivico.db"), os.path.join(ROOT, "backend/data/matchcivico.db")]

VACIOS = ("", "sin captura", "sin dato", "no aplica")
COLUMNAS_CORTA = {1: "propuesta_1_corta", 2: "propuesta_2_corta", 3: "propuesta_genero_corta"}

SCHEMA = """
CREATE TABLE IF NOT EXISTS candidatos_propuesta_etiquetas (
    id_anonimo INTEGER NOT NULL,
    propuesta INTEGER NOT NULL,
    etiqueta TEXT NOT NULL,
    peso REAL NOT NULL,
    PRIMARY KEY (id_anonimo, propuesta, etiqueta)
);
CREATE INDEX IF NOT EXISTS idx_propuesta_etiquetas_etiqueta
    ON candidatos_propuesta_etiquetas(etiqueta);
"""


def texto_util(valor):
    texto = (valor or "").strip()
    if texto.lower() in VACIOS:
        return ""
    return texto


def legible(texto, limite=500):
    """Quita las mayúsculas sostenidas y corta en la última oración que quepa."""
    plano = re.sub(r"\s+", " ", texto).strip()
    letras = [c for c in plano if c.isalpha()]
    mayusculas = [c for c in letras if c.isupper()]
    if len(letras) > 20 and len(mayusculas) / len(letras) > 0.7:
        plano = plano.lower()
        plano = re.sub(r"(^|[.!?]\s+)([a-záéíóúüñ])", lambda m: m.group(1) + m.group(2).upper(), plano)
    if len(plano) <= limite:
        return plano
    corte = plano.rfind(".", 0, limite)
    if corte < 80:
        corte = plano.rfind(" ", 0, limite)
    return plano[:corte].rstrip() + "…"


def preguntas_de(tax, numero):
    if numero == 3:
        bloques = [tax["enfoque_genero"], *tax["transversales"]]
    else:
        bloques = [*tax["ejes"], *tax["enfoques"], *tax["transversales"]]
    out = {}
    for bloque in bloques:
        pregunta = {"type": bloque.get("type", "choice" if "criteria" in bloque and not bloque["id"].startswith("eje_") else "noul"),
                    "instructions": bloque["instructions"]}
        if bloque["id"].startswith("eje_"):
            pregunta = {"type": "noul", "instructions": bloque["instructions"]}
        elif "criteria" in bloque and bloque.get("type") != "score":
            pregunta = {"type": "choice", "instructions": bloque["instructions"], "criteria": bloque["criteria"]}
        elif bloque.get("type") == "score":
            pregunta = {"type": "score", "instructions": bloque["instructions"], "criteria": bloque["criteria"]}
        elif bloque.get("type") == "noul":
            pregunta = {"type": "noul", "instructions": bloque["instructions"]}
        out[bloque["id"]] = pregunta
    return out


def asegurar_columnas(conn):
    conn.executescript(SCHEMA)
    existentes = {row[1] for row in conn.execute("PRAGMA table_info(candidatos_candidatos)")}
    for columna in COLUMNAS_CORTA.values():
        if columna not in existentes:
            conn.execute(f"ALTER TABLE candidatos_candidatos ADD COLUMN {columna} TEXT")


def guardar_extractos(conn):
    filas = conn.execute("""
        SELECT id_anonimo, propuesta_1, propuesta_2, propuesta_genero
        FROM candidatos_candidatos
        WHERE tipo_candidato = 'Persona Propietaria'
    """).fetchall()
    for cid, p1, p2, genero in filas:
        cortos = [legible(texto_util(p)) for p in (p1, p2, genero)]
        conn.execute("""
            UPDATE candidatos_candidatos
            SET propuesta_1_corta = ?, propuesta_2_corta = ?, propuesta_genero_corta = ?
            WHERE id_anonimo = ?
        """, (*cortos, cid))


def textos_pendientes(db_path, hechos):
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT id_anonimo, cargo, propuesta_1, propuesta_2, propuesta_genero
        FROM candidatos_candidatos
        WHERE tipo_candidato = 'Persona Propietaria'
        ORDER BY id_anonimo
    """).fetchall()
    conn.close()
    pendientes = []
    for cid, cargo, p1, p2, genero in rows:
        for numero, valor in ((1, p1), (2, p2), (3, genero)):
            texto = texto_util(valor)
            if texto and (cid, numero) not in hechos:
                pendientes.append((cid, numero, cargo or "", texto))
    return pendientes


def cargar_crudo(version):
    hechos = {}
    if os.path.exists(RAW_PATH):
        with open(RAW_PATH, encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                if rec.get("taxonomia_version") == version and "propuesta" in rec:
                    hechos[(rec["id_anonimo"], rec["propuesta"])] = rec["answers"]
    return hechos


def llamar(url, model, api_key, state, questions, retries=5):
    body = json.dumps({"model": model, "state": state, "questions": questions}).encode()
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    for attempt in range(retries):
        try:
            req = urllib.request.Request(url, body, headers)
            with urllib.request.urlopen(req, timeout=300) as resp:
                return json.load(resp)["answers"]
        except urllib.error.HTTPError as e:
            if e.code not in (429, 500, 502, 503) or attempt == retries - 1:
                raise RuntimeError(f"HTTP {e.code}: {e.read().decode(errors='replace')[:300]}") from e
            wait = float(e.headers.get("Retry-After") or 2 ** attempt)
        except (urllib.error.URLError, TimeoutError):
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
        time.sleep(wait)


def pesos(tax, numero, answers):
    out = {}
    if numero != 3:
        for eje in tax["ejes"]:
            out[eje["id"]] = answers[eje["id"]]["noul"]
        for enfoque in tax["enfoques"]:
            probabilidad_eje = answers[enfoque["eje"]]["noul"]
            for opcion, probabilidad in answers[enfoque["id"]]["probabilities"].items():
                if opcion != "no_aplica":
                    out[f"{enfoque['id']}.{opcion}"] = probabilidad_eje * probabilidad
    else:
        for opcion, probabilidad in answers["enfoque_genero"]["probabilities"].items():
            out[f"enfoque_genero.{opcion}"] = probabilidad
    for transversal in tax["transversales"]:
        respuesta = answers[transversal["id"]]
        if transversal["type"] == "noul":
            out[transversal["id"]] = respuesta["noul"]
        elif transversal["type"] == "score":
            out[transversal["id"]] = respuesta["score"] / (len(transversal["criteria"]) - 1)
    return out


def cargar_tabla(tax, hechos):
    filas = []
    for (cid, numero), answers in hechos.items():
        for etiqueta, peso in pesos(tax, numero, answers).items():
            filas.append((cid, numero, etiqueta, round(peso, 4)))
    for db_path in DB_PATHS:
        if not os.path.exists(db_path):
            continue
        conn = sqlite3.connect(db_path)
        asegurar_columnas(conn)
        guardar_extractos(conn)
        conn.execute("DELETE FROM candidatos_propuesta_etiquetas")
        conn.executemany("""
            INSERT INTO candidatos_propuesta_etiquetas (id_anonimo, propuesta, etiqueta, peso)
            VALUES (?, ?, ?, ?)
        """, filas)
        conn.commit()
        conn.close()
        print(f"  {db_path}: {len(hechos)} textos, {len(filas)} etiquetas")


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--url", default="http://127.0.0.1:8000/v1/systemone")
    parser.add_argument("--model", default="decider")
    parser.add_argument("--workers", type=int, default=2)
    parser.add_argument("--limit", type=int, default=0, help="máximo de textos nuevos (0 = todos)")
    args = parser.parse_args()
    api_key = os.environ.get("ETIQUETADO_API_KEY")

    with open(TAXONOMIA, encoding="utf-8") as f:
        tax = json.load(f)
    version = tax["version"]
    juegos = {1: preguntas_de(tax, 1), 3: preguntas_de(tax, 3)}
    juegos[2] = juegos[1]
    hechos = cargar_crudo(version)
    pendientes = textos_pendientes(DB_PATHS[0], set(hechos))
    if args.limit:
        pendientes = pendientes[:args.limit]
    print(f"Taxonomía v{version}: {len(juegos[1])} preguntas por propuesta, "
          f"{len(juegos[3])} por género | listos: {len(hechos)} | pendientes: {len(pendientes)}", flush=True)

    errores = 0
    if pendientes:
        inicio = time.time()
        os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
        with open(RAW_PATH, "a", encoding="utf-8") as salida, ThreadPoolExecutor(args.workers) as pool:
            futuros = {
                pool.submit(llamar, args.url, args.model, api_key,
                            {"cargo": cargo, "texto": texto}, juegos[numero]): (cid, numero)
                for cid, numero, cargo, texto in pendientes
            }
            for n, futuro in enumerate(as_completed(futuros), 1):
                cid, numero = futuros[futuro]
                try:
                    answers = futuro.result()
                except Exception as exc:
                    errores += 1
                    print(f"  error en #{cid} propuesta {numero}: {exc}", file=sys.stderr)
                    continue
                hechos[(cid, numero)] = answers
                salida.write(json.dumps({
                    "id_anonimo": cid, "propuesta": numero, "taxonomia_version": version,
                    "modelo": args.model, "answers": answers,
                }, ensure_ascii=False) + "\n")
                salida.flush()
                if n % 50 == 0 or n == len(pendientes):
                    ritmo = (time.time() - inicio) / n
                    print(f"  {n}/{len(pendientes)}  {ritmo:.2f}s/texto  faltan ~{ritmo * (len(pendientes) - n) / 60:.0f} min", flush=True)

    print("Cargando candidatos_propuesta_etiquetas:", flush=True)
    cargar_tabla(tax, hechos)
    if errores:
        print(f"{errores} textos fallaron; vuelve a correr el script para reintentarlos.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
