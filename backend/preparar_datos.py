#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Preprocesador de datos para "Match Cívico: Comparador Neutral de Candidaturas a Ciegas" (Hackathon INE).
Unifica:
  1. baseDatosCandidatos.xls (Sistema Conóceles INE 2024 - 4,584 candidaturas)
  2. DatosAbiertos_DECEyEC_ConteosCensales2024/*.csv (Conteos Censales de Participación 2024)
Genera:
  - datos_unificados.json
  - candidatos_limpios.json
  - participacion_distritos.json
"""

import glob
import json
import os
import re
import struct
import time
import unicodedata
import zipfile
from pathlib import Path

import pandas as pd


def normalizar_texto(texto: str) -> str:
    """Convierte a mayúsculas sin acentos y limpia espacios extra para cruces."""
    if not texto:
        return ""
    s = str(texto).strip().upper()
    s = "".join(
        c for c in unicodedata.normalize("NFD", s) if unicodedata.category(c) != "Mn"
    )
    return re.sub(r"\s+", " ", s)


def limpiar_campo(val) -> str:
    """Limpia valores nulos o marcadores vacíos ('Sin dato', 'No aplica', etc.)."""
    if val is None:
        return ""
    if isinstance(val, float) and pd.isna(val):
        return ""
    s = str(val).strip()
    if s.lower() in ("nan", "none", "null"):
        return ""
    return s


def parsear_distrito(raw_distrito: str) -> tuple[int, str]:
    """
    Extrae (distrito_id, distrito_nombre) de cadenas tipo '2-MEXICALI' o '8-TIJUANA'.
    Ignora 'No aplica'.
    """
    s = limpiar_campo(raw_distrito)
    if not s or "no aplica" in s.lower():
        return 0, ""
    m = re.match(r"^(\d+)\s*-\s*(.+)$", s)
    if m:
        return int(m.group(1)), m.group(2).strip()
    if s.isdigit():
        return int(s), ""
    return 0, s


def leer_xls_biff8_nativo(ruta_xls: str) -> list[dict]:
    """
    Lector nativo ligero para archivos .xls en formato binario CDFV2 (BIFF8)
    para no depender obligatoriamente de xlrd externo si no está instalado.
    """
    with open(ruta_xls, "rb") as f:
        data = f.read()

    sector_size = 1 << struct.unpack("<H", data[30:32])[0]
    dir_first_sector = struct.unpack("<I", data[48:52])[0]
    difat_first_sector = struct.unpack("<I", data[68:72])[0]
    num_difat_sectors = struct.unpack("<I", data[72:76])[0]

    difat = list(struct.unpack("<109I", data[76:512]))
    curr = difat_first_sector
    for _ in range(num_difat_sectors):
        if curr >= 0xFFFFFFFE:
            break
        off = (curr + 1) * sector_size
        entries = struct.unpack(
            f"<{sector_size // 4}I", data[off : off + sector_size]
        )
        difat.extend(entries[:-1])
        curr = entries[-1]

    fat = []
    for s in difat:
        if s >= 0xFFFFFFFE:
            continue
        off = (s + 1) * sector_size
        fat.extend(
            struct.unpack(f"<{sector_size // 4}I", data[off : off + sector_size])
        )

    def obtener_cadena_sectores(start_sector: int, size: int | None = None) -> bytes:
        chain = []
        s = start_sector
        while s < 0xFFFFFFFE:
            chain.append(s)
            s = fat[s]
        raw = b"".join(
            data[(sec + 1) * sector_size : (sec + 2) * sector_size] for sec in chain
        )
        return raw[:size] if size is not None else raw

    dir_stream = obtener_cadena_sectores(dir_first_sector)
    wb_start, wb_size = 2, None
    for i in range(0, len(dir_stream), 128):
        entry = dir_stream[i : i + 128]
        name_len = struct.unpack("<H", entry[64:66])[0]
        if name_len == 0:
            continue
        name = entry[: name_len - 2].decode("utf-16le", errors="ignore")
        if name in ("Workbook", "Book"):
            wb_start = struct.unpack("<I", entry[116:120])[0]
            wb_size = struct.unpack("<I", entry[120:124])[0]
            break

    wb = obtener_cadena_sectores(wb_start, wb_size)
    records = []
    pos = 0
    while pos + 4 <= len(wb):
        rec_id, rec_len = struct.unpack("<HH", wb[pos : pos + 4])
        payload = wb[pos + 4 : pos + 4 + rec_len]
        pos += 4 + rec_len
        if rec_id == 0x003C and records:
            records[-1][1].append(payload)
        else:
            records.append((rec_id, [payload]))

    sst = []
    for rec_id, chunks in records:
        if rec_id == 0x00FC:
            _, unique_strings = struct.unpack("<II", chunks[0][:8])
            st = [0, 8]

            def read_bytes(n: int) -> bytes:
                out = bytearray()
                while len(out) < n:
                    avail = len(chunks[st[0]]) - st[1]
                    if avail == 0:
                        st[0] += 1
                        st[1] = 0
                        avail = len(chunks[st[0]])
                    take = min(n - len(out), avail)
                    out.extend(chunks[st[0]][st[1] : st[1] + take])
                    st[1] += take
                return bytes(out)

            def read_string_chars(char_count: int, is_16bit: bool) -> str:
                chars = []
                rem = char_count
                while rem > 0:
                    avail_bytes = len(chunks[st[0]]) - st[1]
                    if avail_bytes == 0:
                        st[0] += 1
                        opt = chunks[st[0]][0]
                        st[1] = 1
                        is_16bit = bool(opt & 0x01)
                        avail_bytes = len(chunks[st[0]]) - st[1]
                    bpc = 2 if is_16bit else 1
                    take = min(rem, avail_bytes // bpc)
                    raw = chunks[st[0]][st[1] : st[1] + take * bpc]
                    st[1] += take * bpc
                    chars.append(
                        raw.decode(
                            "utf-16le" if is_16bit else "latin1", errors="replace"
                        )
                    )
                    rem -= take
                return "".join(chars)

            for _ in range(unique_strings):
                char_count = struct.unpack("<H", read_bytes(2))[0]
                flags = read_bytes(1)[0]
                is_16bit = bool(flags & 0x01)
                has_ext = bool(flags & 0x04)
                has_rich = bool(flags & 0x08)
                rich_runs = struct.unpack("<H", read_bytes(2))[0] if has_rich else 0
                ext_size = struct.unpack("<I", read_bytes(4))[0] if has_ext else 0
                s = read_string_chars(char_count, is_16bit)
                if rich_runs:
                    read_bytes(4 * rich_runs)
                if ext_size:
                    read_bytes(ext_size)
                sst.append(s)

    rows: dict[int, dict[int, object]] = {}
    for rec_id, chunks in records:
        b = chunks[0]
        if rec_id == 0x00FD:  # LABELSST
            r, c, _, sst_idx = struct.unpack("<HHHI", b[:10])
            rows.setdefault(r, {})[c] = sst[sst_idx]
        elif rec_id == 0x0203:  # NUMBER
            r, c, _, val = struct.unpack("<HHHd", b[:14])
            rows.setdefault(r, {})[c] = int(val) if val.is_integer() else val

    headers = [ str(rows[0].get(c, "")).strip() for c in range(max(rows[0].keys()) + 1) ]
    resultado = []
    for r_idx in range(1, max(rows.keys()) + 1):
        if r_idx in rows:
            resultado.append(
                {headers[c]: rows[r_idx].get(c, "") for c in range(len(headers))}
            )
    return resultado


def cargar_candidatos(ruta_xls: str) -> tuple[list[dict], dict[tuple[str, int], str]]:
    """
    Carga baseDatosCandidatos.xls (con pandas/xlrd si está disponible o lector BIFF8 nativo)
    y devuelve la lista limpia de candidatos y el mapa de nombres de cabecera distrital.
    """
    print(f"[1/3] Leyendo candidaturas desde: {ruta_xls} ...")
    try:
        df = pd.read_excel(ruta_xls)
        registros_raw = df.to_dict(orient="records")
    except Exception:
        registros_raw = leer_xls_biff8_nativo(ruta_xls)

    candidatos = []
    nombres_distritos: dict[tuple[str, int], str] = {}

    for idx, row in enumerate(registros_raw, start=1):
        entidad_raw = limpiar_campo(row.get("ENTIDAD", ""))
        entidad_norm = normalizar_texto(entidad_raw)
        distrito_raw = limpiar_campo(row.get("DISTRITO_FEDERAL", ""))
        distrito_id, distrito_nombre = parsear_distrito(distrito_raw)

        if entidad_norm and distrito_id > 0 and distrito_nombre:
            nombres_distritos[(entidad_norm, distrito_id)] = distrito_nombre

        edad_raw = row.get("EDAD", 0)
        try:
            edad = int(float(edad_raw)) if limpiar_campo(edad_raw) != "" else 0
        except ValueError:
            edad = 0

        prop_1 = limpiar_campo(row.get("PROPUESTA_1", ""))
        prop_2 = limpiar_campo(row.get("PROPUESTA_2", ""))
        prop_genero = limpiar_campo(row.get("PROPUESTA_GENERO", ""))

        tiene_propuestas = any(
            p and p.lower() not in ("sin captura", "sin dato", "no aplica")
            for p in (prop_1, prop_2, prop_genero)
        )

        candidato = {
            "id_anonimo": idx,
            "partido_coalicion": limpiar_campo(row.get("PARTIDO_COALICION", "")),
            "cargo": limpiar_campo(row.get("CARGO", "")),
            "entidad": entidad_norm,
            "distrito_federal": distrito_raw,
            "distrito_id": distrito_id,
            "distrito_nombre": distrito_nombre,
            "circunscripcion": limpiar_campo(row.get("CIRCUNSCRIPCION", "")),
            "municipio": limpiar_campo(row.get("MUNICIPIO", "")),
            "num_lista_o_formula": limpiar_campo(row.get("NUM_LISTA_O_FORMULA", "")),
            "nombre_candidato": limpiar_campo(row.get("NOMBRE_CANDIDATO", "")),
            "tipo_candidato": limpiar_campo(row.get("TIPO_CANDIDATO", "")),
            "estatus": limpiar_campo(row.get("ESTATUS", "")),
            "edad": edad,
            "sexo": limpiar_campo(row.get("SEXO", "")),
            "escolaridad": limpiar_campo(row.get("ESCOLARIDAD", "")),
            "estatus_escolaridad": limpiar_campo(row.get("ESTATUS_ESCOLARIDAD", "")),
            "cursos": limpiar_campo(row.get("CURSOS", "")),
            "historia_profesional": limpiar_campo(row.get("HISTORIA_PROFESIONAL", "")),
            "trayectoria_politica": limpiar_campo(row.get("TRAYECTORIA_POLITICA", "")),
            "motivo_cargo_publico": limpiar_campo(row.get("MOTIVO_CARGO_PUBLICO", "")),
            "propuesta_1": prop_1,
            "propuesta_2": prop_2,
            "propuesta_genero": prop_genero,
            "redes": limpiar_campo(row.get("REDES", "")),
            "pagina_web": limpiar_campo(row.get("PAGINA_WEB", "")),
            "correo_electronico": limpiar_campo(row.get("CORREO_ELECTRONICO", "")),
            "telefono": limpiar_campo(row.get("TELEFONO", "")),
            "tiene_propuestas": tiene_propuestas,
        }
        candidatos.append(candidato)

    print(
        f"      -> {len(candidatos)} candidaturas procesadas "
        f"({sum(1 for c in candidatos if c['tipo_candidato'] == 'Persona Propietaria')} propietarias)."
    )
    return candidatos, nombres_distritos


def procesar_conteos_censales(
    carpeta_csv: str,
    ruta_zip: str,
    nombres_distritos: dict[tuple[str, int], str],
) -> list[dict]:
    """
    Lee los 32 archivos CSV de ConteosCensales2024 y calcula la participación
    y abstencionismo general y juvenil (18 a 29 años) por entidad y distrito federal (DEF).
    Columnas usadas: EDOCVE, EDONOM, DEF, SEXO, EDAD, LN, SV, NV, NS.
    """
    archivos_csv = sorted(glob.glob(os.path.join(carpeta_csv, "*.csv")))
    usar_zip = False
    if not archivos_csv and os.path.exists(ruta_zip):
        usar_zip = True
        print(f"[2/3] Leyendo CSVs directamente desde el ZIP: {ruta_zip} ...")
    else:
        print(
            f"[2/3] Procesando {len(archivos_csv)} archivos CSV en {carpeta_csv} ..."
        )

    columnas = ["EDOCVE", "EDONOM", "DEF", "SEXO", "EDAD", "LN", "SV", "NV", "NS"]
    entidades_lista = []

    def agregar_df(df: pd.DataFrame):
        df = df[df["DEF"] > 0]
        if df.empty:
            return
        edocve = int(df["EDOCVE"].iloc[0])
        edonom = normalizar_texto(str(df["EDONOM"].iloc[0]))

        ln_total = int(df["LN"].sum())
        sv_total = int(df["SV"].sum())
        nv_total = int(df["NV"].sum())
        ns_total = int(df["NS"].sum())

        df_joven = df[(df["EDAD"] >= 18) & (df["EDAD"] <= 29)]
        ln_joven = int(df_joven["LN"].sum())
        sv_joven = int(df_joven["SV"].sum())
        nv_joven = int(df_joven["NV"].sum())
        ns_joven = int(df_joven["NS"].sum())

        part_gen = round((sv_total / ln_total) * 100, 2) if ln_total else 0.0
        abst_gen = round(100.0 - part_gen, 2) if ln_total else 0.0
        part_jov = round((sv_joven / ln_joven) * 100, 2) if ln_joven else 0.0
        abst_jov = round(100.0 - part_jov, 2) if ln_joven else 0.0

        distritos_resumen = []
        # Agrupación vectorizada por DEF
        grp_gen = df.groupby("DEF", as_index=False)[["LN", "SV", "NV", "NS"]].sum()
        grp_jov = (
            df_joven.groupby("DEF", as_index=False)[["LN", "SV", "NV", "NS"]]
            .sum()
            .set_index("DEF")
        )
        # Desglose juvenil por sexo (0=Hombres, 1=Mujeres, 2=No binario)
        grp_sexo = df_joven.groupby(["DEF", "SEXO"], as_index=False)[
            ["LN", "SV"]
        ].sum()
        mapa_sexo: dict[int, dict[str, dict]] = {}
        etiquetas_sexo = {0: "hombres", 1: "mujeres", 2: "no_binario"}
        for _, srow in grp_sexo.iterrows():
            d_id = int(srow["DEF"])
            s_code = int(srow["SEXO"])
            s_ln = int(srow["LN"])
            s_sv = int(srow["SV"])
            s_part = round((s_sv / s_ln) * 100, 2) if s_ln else 0.0
            mapa_sexo.setdefault(d_id, {})[etiquetas_sexo.get(s_code, str(s_code))] = {
                "lista_nominal": s_ln,
                "votos": s_sv,
                "participacion_pct": s_part,
                "abstencionismo_pct": round(100.0 - s_part, 2) if s_ln else 0.0,
            }

        for _, drow in grp_gen.sort_values("DEF").iterrows():
            d_id = int(drow["DEF"])
            d_ln = int(drow["LN"])
            d_sv = int(drow["SV"])
            d_nv = int(drow["NV"])
            d_ns = int(drow["NS"])

            if d_id in grp_jov.index:
                jrow = grp_jov.loc[d_id]
                dj_ln = int(jrow["LN"])
                dj_sv = int(jrow["SV"])
                dj_nv = int(jrow["NV"])
                dj_ns = int(jrow["NS"])
            else:
                dj_ln = dj_sv = dj_nv = dj_ns = 0

            d_part_gen = round((d_sv / d_ln) * 100, 2) if d_ln else 0.0
            d_abst_gen = round(100.0 - d_part_gen, 2) if d_ln else 0.0
            d_part_jov = round((dj_sv / dj_ln) * 100, 2) if dj_ln else 0.0
            d_abst_jov = round(100.0 - d_part_jov, 2) if dj_ln else 0.0

            d_nombre = nombres_distritos.get((edonom, d_id), f"DISTRITO {d_id}")

            distritos_resumen.append(
                {
                    "entidad": edonom,
                    "distrito_id": d_id,
                    "distrito_nombre": d_nombre,
                    "lista_nominal": d_ln,
                    "votos_totales": d_sv,
                    "no_votaron": d_nv,
                    "no_especificado": d_ns,
                    "participacion_general_pct": d_part_gen,
                    "abstencionismo_general_pct": d_abst_gen,
                    "lista_nominal_joven_18_29": dj_ln,
                    "votos_joven_18_29": dj_sv,
                    "no_votaron_joven_18_29": dj_nv,
                    "no_especificado_joven_18_29": dj_ns,
                    "participacion_joven_pct": d_part_jov,
                    "abstencionismo_joven_pct": d_abst_jov,
                    "brecha_abstencionismo_joven_vs_general_pts": round(
                        d_abst_jov - d_abst_gen, 2
                    ),
                    "desglose_sexo_joven": mapa_sexo.get(d_id, {}),
                }
            )

        entidades_lista.append(
            {
                "entidad_id": edocve,
                "entidad": edonom,
                "total_distritos": len(distritos_resumen),
                "lista_nominal": ln_total,
                "votos_totales": sv_total,
                "no_votaron": nv_total,
                "no_especificado": ns_total,
                "participacion_general_pct": part_gen,
                "abstencionismo_general_pct": abst_gen,
                "lista_nominal_joven_18_29": ln_joven,
                "votos_joven_18_29": sv_joven,
                "no_votaron_joven_18_29": nv_joven,
                "no_especificado_joven_18_29": ns_joven,
                "participacion_joven_pct": part_jov,
                "abstencionismo_joven_pct": abst_jov,
                "brecha_abstencionismo_joven_vs_general_pts": round(
                    abst_jov - abst_gen, 2
                ),
                "distritos": distritos_resumen,
            }
        )

    if usar_zip:
        with zipfile.ZipFile(ruta_zip, "r") as zf:
            csv_names = sorted(
                n for n in zf.namelist() if n.lower().endswith(".csv")
            )
            for name in csv_names:
                with zf.open(name) as f:
                    df = pd.read_csv(f, usecols=columnas)
                    agregar_df(df)
    else:
        for path in archivos_csv:
            df = pd.read_csv(path, usecols=columnas)
            agregar_df(df)

    entidades_lista.sort(key=lambda x: x["entidad_id"])
    total_dist = sum(e["total_distritos"] for e in entidades_lista)
    print(
        f"      -> {len(entidades_lista)} entidades federativas y {total_dist} distritos federales calculados."
    )
    return entidades_lista


def localizar_fuentes() -> tuple[str, str, str]:
    """Busca los archivos de entrada tanto en ./ como en ./Datos/."""
    posibles_xls = [
        "baseDatosCandidatos.xls",
        os.path.join("Datos", "baseDatosCandidatos.xls"),
    ]
    ruta_xls = next((p for p in posibles_xls if os.path.exists(p)), posibles_xls[0])

    posibles_csv = [
        "DatosAbiertos_DECEyEC_ConteosCensales2024",
        os.path.join("Datos", "DatosAbiertos_DECEyEC_ConteosCensales2024"),
    ]
    carpeta_csv = next(
        (p for p in posibles_csv if os.path.isdir(p)), posibles_csv[0]
    )

    posibles_zip = [
        "DatosAbiertos_DECEyEC_ConteosCensales2024.zip",
        os.path.join("Datos", "DatosAbiertos_DECEyEC_ConteosCensales2024.zip"),
    ]
    ruta_zip = next((p for p in posibles_zip if os.path.exists(p)), posibles_zip[0])

    return ruta_xls, carpeta_csv, ruta_zip


def main():
    import sys

    out_dir = Path("data")
    out_dir.mkdir(parents=True, exist_ok=True)
    ruta_unificado = out_dir / "datos_unificados.json"

    if ruta_unificado.exists() and "--force" not in sys.argv:
        peso_mb = ruta_unificado.stat().st_size / (1024 * 1024)
        print(
            f"Los datos limpios ya existen en '{ruta_unificado}' ({peso_mb:.2f} MB). "
            "Usa '--force' si deseas regenerarlos desde cero."
        )
        return

    t0 = time.time()
    ruta_xls, carpeta_csv, ruta_zip = localizar_fuentes()

    candidatos, nombres_distritos = cargar_candidatos(ruta_xls)
    entidades = procesar_conteos_censales(carpeta_csv, ruta_zip, nombres_distritos)

    print("[3/3] Exportando archivos JSON optimizados en carpeta 'data/' ...")
    datos_unificados = {
        "metadata": {
            "proyecto": "Match Cívico: Comparador Neutral de Candidaturas a Ciegas",
            "fuente_candidatos": "INE Conóceles - Elecciones Federales 2024",
            "fuente_participacion": "INE DECEyEC - Conteos Censales de Participación Ciudadana 2024",
            "total_candidatos": len(candidatos),
            "total_candidatos_propietarios": sum(
                1 for c in candidatos if c["tipo_candidato"] == "Persona Propietaria"
            ),
            "total_entidades": len(entidades),
            "total_distritos": sum(e["total_distritos"] for e in entidades),
        },
        "entidades": entidades,
        "candidatos": candidatos,
    }

    with open(ruta_unificado, "w", encoding="utf-8") as f:
        json.dump(datos_unificados, f, ensure_ascii=False)

    with open(out_dir / "candidatos_limpios.json", "w", encoding="utf-8") as f:
        json.dump(candidatos, f, ensure_ascii=False)

    with open(out_dir / "participacion_distritos.json", "w", encoding="utf-8") as f:
        json.dump(entidades, f, ensure_ascii=False)

    peso_mb = ruta_unificado.stat().st_size / (1024 * 1024)
    print(
        f"¡Listo en {time.time() - t0:.2f}s! Archivo '{ruta_unificado}' generado ({peso_mb:.2f} MB)."
    )


if __name__ == "__main__":
    main()

