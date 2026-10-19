#!/usr/bin/env python3
"""
Populate SQLite database from backend/data/datos_unificados.json
Creates both db/matchcivico.db and a copy/link in backend/data/matchcivico.db
"""

import json
import os
import shutil
import sqlite3
import sys

def main():
    root_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "../.."))
    json_path = os.path.join(root_dir, "backend/data/datos_unificados.json")
    schema_path = os.path.join(root_dir, "db/schema.sql")
    db_path = os.path.join(root_dir, "db/matchcivico.db")
    backend_db_path = os.path.join(root_dir, "backend/data/matchcivico.db")

    if not os.path.exists(json_path):
        print(f"Error: dataset not found at {json_path}")
        sys.exit(1)

    print(f"Loading data from {json_path}...")
    with open(json_path, "r", encoding="utf-8") as f:
        data = json.load(f)

    candidatos = data.get("candidatos", [])
    entidades = data.get("entidades", [])

    print(f"Loaded {len(candidatos)} candidatos and {len(entidades)} entidades.")

    # Remove existing db if present to ensure clean state
    if os.path.exists(db_path):
        os.remove(db_path)

    os.makedirs(os.path.dirname(db_path), exist_ok=True)
    conn = sqlite3.connect(db_path)
    cur = conn.cursor()

    # Apply schema
    with open(schema_path, "r", encoding="utf-8") as f:
        cur.executescript(f.read())

    # Insert candidatos
    print("Inserting candidatos...")
    candidatos_rows = []
    for c in candidatos:
        estatus_esc = (c.get("estatus_escolaridad") or "").strip()
        tiene_titulo = 1 if estatus_esc.lower() in ("título", "titulo", "cédula profesional", "cedula profesional") else 0
        estudios = f"{c.get('escolaridad', '')} ({estatus_esc})".strip(" ()")

        row = (
            c.get("id_anonimo"),
            c.get("nombre_candidato", ""),
            c.get("partido_coalicion", ""),
            c.get("cargo", ""),
            c.get("entidad", ""),
            c.get("distrito_id", 0),
            c.get("distrito_nombre", ""),
            c.get("distrito_federal", ""),
            c.get("circunscripcion", ""),
            c.get("municipio", ""),
            c.get("num_lista_o_formula", ""),
            c.get("tipo_candidato", ""),
            c.get("estatus", ""),
            c.get("edad", 0),
            c.get("sexo", ""),
            c.get("escolaridad", ""),
            estatus_esc,
            tiene_titulo,
            estudios,
            c.get("cursos", ""),
            c.get("historia_profesional", ""),
            c.get("trayectoria_politica", ""),
            c.get("motivo_cargo_publico", ""),
            c.get("propuesta_1", ""),
            c.get("propuesta_2", ""),
            c.get("propuesta_genero", ""),
            c.get("redes", ""),
            c.get("pagina_web", ""),
            c.get("correo_electronico", ""),
            c.get("telefono", ""),
            1 if c.get("tiene_propuestas") else 0
        )
        candidatos_rows.append(row)

    cur.executemany("""
        INSERT INTO candidatos_candidatos (
            id_anonimo, nombre_candidato, partido_coalicion, cargo, entidad,
            distrito_id, distrito_nombre, distrito_federal, circunscripcion,
            municipio, num_lista_o_formula, tipo_candidato, estatus, edad, sexo,
            escolaridad, estatus_escolaridad, tiene_titulo, estudios, cursos,
            historia_profesional, trayectoria_politica, motivo_cargo_publico,
            propuesta_1, propuesta_2, propuesta_genero, redes, pagina_web,
            correo_electronico, telefono, tiene_propuestas
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, candidatos_rows)

    # Insert entidades and distritos
    print("Inserting entidades and distritos...")
    entidades_rows = []
    distritos_rows = []

    for e in entidades:
        eid = e.get("entidad_id")
        ent_nombre = e.get("entidad", "")
        ent_row = (
            eid,
            ent_nombre,
            e.get("total_distritos", 0),
            e.get("lista_nominal", 0),
            e.get("votos_totales", 0),
            e.get("no_votaron", 0),
            e.get("no_especificado", 0),
            e.get("participacion_general_pct", 0.0),
            e.get("abstencionismo_general_pct", 0.0),
            e.get("lista_nominal_joven_18_29", 0),
            e.get("votos_joven_18_29", 0),
            e.get("no_votaron_joven_18_29", 0),
            e.get("no_especificado_joven_18_29", 0),
            e.get("participacion_joven_pct", 0.0),
            e.get("abstencionismo_joven_pct", 0.0),
            e.get("brecha_abstencionismo_joven_vs_general_pts", 0.0)
        )
        entidades_rows.append(ent_row)

        for d in e.get("distritos", []):
            dist_row = (
                eid,
                ent_nombre,
                d.get("distrito_id", 0),
                d.get("distrito_nombre", ""),
                d.get("lista_nominal", 0),
                d.get("votos_totales", 0),
                d.get("no_votaron", 0),
                d.get("no_especificado", 0),
                d.get("participacion_general_pct", 0.0),
                d.get("abstencionismo_general_pct", 0.0),
                d.get("lista_nominal_joven_18_29", 0),
                d.get("votos_joven_18_29", 0),
                d.get("no_votaron_joven_18_29", 0),
                d.get("no_especificado_joven_18_29", 0),
                d.get("participacion_joven_pct", 0.0),
                d.get("abstencionismo_joven_pct", 0.0),
                d.get("brecha_abstencionismo_joven_vs_general_pts", 0.0),
                json.dumps(d.get("desglose_sexo_joven", {}), ensure_ascii=False)
            )
            distritos_rows.append(dist_row)

    cur.executemany("""
        INSERT INTO votantes_entidades (
            entidad_id, entidad, total_distritos, lista_nominal, votos_totales,
            no_votaron, no_especificado, participacion_general_pct, abstencionismo_general_pct,
            lista_nominal_joven_18_29, votos_joven_18_29, no_votaron_joven_18_29,
            no_especificado_joven_18_29, participacion_joven_pct, abstencionismo_joven_pct,
            brecha_abstencionismo_joven_vs_general_pts
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, entidades_rows)

    cur.executemany("""
        INSERT INTO votantes_distritos (
            entidad_id, entidad, distrito_id, distrito_nombre, lista_nominal,
            votos_totales, no_votaron, no_especificado, participacion_general_pct,
            abstencionismo_general_pct, lista_nominal_joven_18_29, votos_joven_18_29,
            no_votaron_joven_18_29, no_especificado_joven_18_29, participacion_joven_pct,
            abstencionismo_joven_pct, brecha_abstencionismo_joven_vs_general_pts,
            desglose_sexo_joven_json
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, distritos_rows)

    # Insert sample system record to show template usage
    cur.execute("""
        INSERT INTO sistema_resets (tipo_reset, motivo, usuario_o_sesion)
        VALUES ('INITIAL_SEED', 'Database seeded from unified INE 2024 dataset', 'system')
    """)

    conn.commit()
    conn.close()

    # Also copy to backend/data/matchcivico.db for convenient dual access
    os.makedirs(os.path.dirname(backend_db_path), exist_ok=True)
    shutil.copyfile(db_path, backend_db_path)
    print(f"Database successfully generated at:")
    print(f"  - {db_path}")
    print(f"  - {backend_db_path}")

if __name__ == "__main__":
    main()
