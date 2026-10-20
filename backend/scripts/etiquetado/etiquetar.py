#!/usr/bin/env python3
"""
Etiqueta las propuestas de los candidatos propietarios con un modelo System One
(POST /v1/systemone: Decider local, Mercury Decide, Jev...) y llena candidatos_etiquetas.

Las respuestas crudas se guardan en backend/data/candidatos_etiquetas_raw.jsonl. Es reanudable:
los candidatos que ya están ahí para la versión actual de la taxonomía no se vuelven a pedir.
Correrlo después de init_sqlite.py solo recarga la tabla desde ese archivo.

Uso:
  python3 backend/scripts/etiquetado/etiquetar.py                  # Decider en localhost:8000
  python3 backend/scripts/etiquetado/etiquetar.py --limit 5        # prueba corta
  ETIQUETADO_API_KEY=... python3 backend/scripts/etiquetado/etiquetar.py \
      --url https://openrouter.ai/api/v1/systemone --model inception/mercury-decide:free --workers 1
"""

import argparse
import json
import os
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

CREATE_TABLE = """
CREATE TABLE IF NOT EXISTS candidatos_etiquetas (
    id_anonimo INTEGER NOT NULL,
    etiqueta TEXT NOT NULL,
    peso REAL NOT NULL,
    PRIMARY KEY (id_anonimo, etiqueta)
);
CREATE INDEX IF NOT EXISTS idx_candidatos_etiquetas_etiqueta ON candidatos_etiquetas(etiqueta);
"""


def build_questions(tax):
    q = {e["id"]: {"type": "noul", "instructions": e["instructions"]} for e in tax["ejes"]}
    for e in tax["enfoques"]:
        q[e["id"]] = {"type": "choice", "instructions": e["instructions"], "criteria": e["criteria"]}
    for t in tax["transversales"]:
        q[t["id"]] = {k: t[k] for k in ("type", "instructions", "criteria") if k in t}
    return q


def pending_candidates(db_path, done):
    conn = sqlite3.connect(db_path)
    rows = conn.execute("""
        SELECT id_anonimo, cargo, propuesta_1, propuesta_2
        FROM candidatos_candidatos
        WHERE tipo_candidato = 'Persona Propietaria'
          AND (trim(coalesce(propuesta_1, '')) <> '' OR trim(coalesce(propuesta_2, '')) <> '')
        ORDER BY id_anonimo
    """).fetchall()
    conn.close()
    return [r for r in rows if r[0] not in done]


def load_raw(version):
    """Last stored answers per candidate for this taxonomy version."""
    answers = {}
    if os.path.exists(RAW_PATH):
        with open(RAW_PATH, encoding="utf-8") as f:
            for line in f:
                rec = json.loads(line)
                if rec["taxonomia_version"] == version:
                    answers[rec["id_anonimo"]] = rec["answers"]
    return answers


def call(url, model, api_key, state, questions, retries=5):
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
        except (urllib.error.URLError, TimeoutError) as e:
            if attempt == retries - 1:
                raise
            wait = 2 ** attempt
        time.sleep(wait)


def weights(tax, answers):
    """Raw answers -> {etiqueta: peso 0..1}."""
    out = {}
    for e in tax["ejes"]:
        out[e["id"]] = answers[e["id"]]["noul"]
    for e in tax["enfoques"]:
        p_eje = answers[e["eje"]]["noul"]
        for opcion, p in answers[e["id"]]["probabilities"].items():
            if opcion != "no_aplica":
                out[f"{e['id']}.{opcion}"] = p_eje * p
    for t in tax["transversales"]:
        a = answers[t["id"]]
        if t["type"] == "noul":
            out[t["id"]] = a["noul"]
        elif t["type"] == "score":
            out[t["id"]] = a["score"] / (len(t["criteria"]) - 1)
    return out


def load_table(tax, raw):
    rows = [(cid, etiqueta, round(peso, 4)) for cid, ans in raw.items() for etiqueta, peso in weights(tax, ans).items()]
    for db_path in DB_PATHS:
        if not os.path.exists(db_path):
            continue
        conn = sqlite3.connect(db_path)
        conn.executescript(CREATE_TABLE)
        conn.execute("DELETE FROM candidatos_etiquetas")
        conn.executemany("INSERT INTO candidatos_etiquetas (id_anonimo, etiqueta, peso) VALUES (?, ?, ?)", rows)
        conn.commit()
        conn.close()
        print(f"  {db_path}: {len(raw)} candidatos, {len(rows)} etiquetas")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--url", default="http://127.0.0.1:8000/v1/systemone")
    ap.add_argument("--model", default="decider")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--limit", type=int, default=0, help="máximo de candidatos nuevos a etiquetar (0 = todos)")
    args = ap.parse_args()
    api_key = os.environ.get("ETIQUETADO_API_KEY")

    with open(TAXONOMIA, encoding="utf-8") as f:
        tax = json.load(f)
    version = tax["version"]
    questions = build_questions(tax)
    raw = load_raw(version)

    todo = pending_candidates(DB_PATHS[0], set(raw))
    if args.limit:
        todo = todo[:args.limit]
    print(f"Taxonomía v{version}: {len(questions)} preguntas | ya etiquetados: {len(raw)} | pendientes: {len(todo)}")

    errores = 0
    if todo:
        t0 = time.time()
        os.makedirs(os.path.dirname(RAW_PATH), exist_ok=True)
        with open(RAW_PATH, "a", encoding="utf-8") as out, ThreadPoolExecutor(args.workers) as ex:
            futs = {
                ex.submit(call, args.url, args.model, api_key,
                          {"cargo": cargo, "propuesta_1": p1 or "", "propuesta_2": p2 or ""}, questions): cid
                for cid, cargo, p1, p2 in todo
            }
            for n, fut in enumerate(as_completed(futs), 1):
                cid = futs[fut]
                try:
                    answers = fut.result()
                except Exception as e:
                    errores += 1
                    print(f"  error en #{cid}: {e}", file=sys.stderr)
                    continue
                raw[cid] = answers
                out.write(json.dumps({"id_anonimo": cid, "taxonomia_version": version, "modelo": args.model,
                                      "answers": answers}, ensure_ascii=False) + "\n")
                out.flush()
                if n % 50 == 0 or n == len(todo):
                    rate = (time.time() - t0) / n
                    print(f"  {n}/{len(todo)}  {rate:.2f}s/cand  faltan ~{rate * (len(todo) - n) / 60:.0f} min", flush=True)

    print("Cargando candidatos_etiquetas:")
    load_table(tax, raw)
    if errores:
        print(f"{errores} candidatos fallaron; vuelve a correr el script para reintentarlos.", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
